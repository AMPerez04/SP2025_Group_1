import { Button } from "@/components/ui/button";
import { BACKEND_URL } from "@/zustand/store";
import { useStore } from "@/zustand/store";

export function SnapTradeLinkButton() {
  const userID = useStore((state) => state.user.ID);

  const handleClick = async () => {
    if (!userID) {
      alert("You must be logged in to link your investment account.");
      return;
    }

    const res = await fetch(`${BACKEND_URL}/snaptrade/link-account?user_id=${userID}`);
    const data = await res.json();
    window.location.href = data.url.redirectURI;
  };

  return <Button onClick={handleClick}>Link Investment Account</Button>;
}
    