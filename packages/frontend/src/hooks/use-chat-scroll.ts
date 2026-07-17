"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { RefObject } from "react";
import type { UIMessage } from "ai";

// Following only (re-)engages when within this many pixels of the absolute
// bottom. Kept small so content growth (syntax highlighting expanding height)
// can never be mistaken for the user scrolling back down — and so re-engaging
// requires a deliberate return to the bottom rather than grazing a zone.
const ENGAGE_EPSILON = 8;

const SCROLL_UP_KEYS = new Set(["ArrowUp", "PageUp", "Home"]);

interface UseChatScrollOptions {
  scrollRef: RefObject<HTMLElement | null>;
  messages: UIMessage[];
  conversationId: string | null;
  isStreaming: boolean;
}

export function useChatScroll({
  scrollRef,
  messages,
  conversationId,
  isStreaming,
}: UseChatScrollOptions) {
  const isAtBottomRef = useRef(true);
  const [isAtBottom, setIsAtBottom] = useState(true);

  const engage = useCallback(() => {
    isAtBottomRef.current = true;
    setIsAtBottom(true);
  }, []);

  const disengage = useCallback(() => {
    isAtBottomRef.current = false;
    setIsAtBottom(false);
  }, []);

  // Only ever (re-)engages — never disengages. Position alone must not be able
  // to drop follow mode, otherwise content growth firing scroll events would
  // look identical to the user scrolling up.
  const measure = useCallback(() => {
    const el = scrollRef.current;
    if (!el) return;
    const distance = el.scrollHeight - el.scrollTop - el.clientHeight;
    if (distance < ENGAGE_EPSILON) engage();
  }, [scrollRef, engage]);

  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;

    // Disengage the instant the user scrolls up. wheel/touchmove/keydown only
    // fire from genuine input — never from programmatic scrollTop changes or
    // DOM growth — so this is the one reliable "user wants to read up" signal.
    let lastTouchY = 0;
    const hasOverflow = () => {
      const el = scrollRef.current;
      return !!el && el.scrollHeight - el.clientHeight > 0;
    };
    const onWheel = (e: WheelEvent) => {
      if (e.deltaY < 0 && hasOverflow()) disengage();
    };
    const onTouchStart = (e: TouchEvent) => {
      lastTouchY = e.touches[0]?.clientY ?? 0;
    };
    const onTouchMove = (e: TouchEvent) => {
      const y = e.touches[0]?.clientY ?? 0;
      // Finger moving down drags earlier content into view (scrolling toward
      // the top) → user wants to read up, so stop following.
      if (y > lastTouchY && hasOverflow()) disengage();
      lastTouchY = y;
    };
    const onKeyDown = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement | null;
      if (
        target &&
        (target.tagName === "INPUT" ||
          target.tagName === "TEXTAREA" ||
          target.isContentEditable)
      ) {
        return;
      }
      if (SCROLL_UP_KEYS.has(e.key) && hasOverflow()) disengage();
    };

    el.addEventListener("scroll", measure, { passive: true });
    el.addEventListener("wheel", onWheel, { passive: true });
    el.addEventListener("touchstart", onTouchStart, { passive: true });
    el.addEventListener("touchmove", onTouchMove, { passive: true });
    window.addEventListener("keydown", onKeyDown);
    window.addEventListener("resize", measure);
    return () => {
      el.removeEventListener("scroll", measure);
      el.removeEventListener("wheel", onWheel);
      el.removeEventListener("touchstart", onTouchStart);
      el.removeEventListener("touchmove", onTouchMove);
      window.removeEventListener("keydown", onKeyDown);
      window.removeEventListener("resize", measure);
    };
  }, [scrollRef, measure, disengage]);

  // Re-engage follow when a response starts (send / regenerate / edit-resend)
  // so the new exchange is followed even if the user had scrolled up.
  useEffect(() => {
    if (isStreaming) {
      isAtBottomRef.current = true;
    }
  }, [isStreaming]);

  // Re-engage follow on conversation switch; re-measure next frame once the
  // new messages have rendered.
  useEffect(() => {
    isAtBottomRef.current = true;
    const raf = requestAnimationFrame(() => measure());
    return () => cancelAnimationFrame(raf);
  }, [conversationId, measure]);

  // While following, keep the latest content in view as messages change (send,
  // streaming, history load). The rAF catches layout that settles after the
  // effect (highlighting, image decode); it re-checks the follow flag so it can
  // never fight a user who disengaged between the effect and the next frame.
  useEffect(() => {
    const el = scrollRef.current;
    if (!el || !isAtBottomRef.current) return;
    el.scrollTop = el.scrollHeight;
    const raf = requestAnimationFrame(() => {
      if (!scrollRef.current || !isAtBottomRef.current) return;
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    });
    return () => cancelAnimationFrame(raf);
  }, [messages, scrollRef]);

  const scrollToBottom = useCallback(
    (behavior: ScrollBehavior = "smooth") => {
      const el = scrollRef.current;
      if (!el) return;
      el.scrollTo({ top: el.scrollHeight, behavior });
      engage();
    },
    [scrollRef, engage],
  );

  return { isAtBottom, scrollToBottom };
}
