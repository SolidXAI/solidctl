import { useNavigate } from "react-router-dom";

const isAbsoluteUrl = (href: string) => /^[a-z][a-z0-9+.-]*:/.test(href) || href.startsWith("//");

export function useRouter() {
  const navigate = useNavigate();

  const push = (href: string) => {
    if (typeof window !== "undefined" && isAbsoluteUrl(href)) {
      window.location.assign(href);
      return;
    }

    navigate(href);
  };

  const replace = (href: string) => {
    if (typeof window !== "undefined" && isAbsoluteUrl(href)) {
      window.location.replace(href);
      return;
    }

    navigate(href, { replace: true });
  };

  return {
    push,
    replace,
    back: () => navigate(-1),
    forward: () => navigate(1),
    refresh: () => {
      navigate(0);
    },
  };
}
