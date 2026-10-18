import { useEffect, type RefObject } from 'react';
/** Keep the chat shell within the visible viewport when mobile keyboards resize it. */
export function useChatViewport(ref: RefObject<HTMLElement>) {
  useEffect(() => {
    const viewport = window.visualViewport;
    const update = () => {
      const element = ref.current;
      if (!element) return;
      const top = element.getBoundingClientRect().top;
      const bottom = viewport ? viewport.offsetTop + viewport.height : window.innerHeight;
      element.style.setProperty('--chat-visible-height', `${Math.max(180, bottom - Math.max(top, viewport?.offsetTop || 0))}px`);
    };
    update();
    viewport?.addEventListener('resize', update); viewport?.addEventListener('scroll', update);
    window.addEventListener('resize', update);
    return () => { viewport?.removeEventListener('resize', update); viewport?.removeEventListener('scroll', update); window.removeEventListener('resize', update); };
  }, [ref]);
}
