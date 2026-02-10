import { usePathname } from "../../hooks/usePathname";
import { useRouter } from "../../hooks/useRouter";
import { useState } from "react";

const NavbarTwo = () => {
  const router = useRouter();
  const pathname = usePathname();
  const [renderMenu, setRenderMenu] = useState();

  const iamMenu = [
    {
      title: "Users",
      url: "users",
      subMenu: [],
    },
    {
      title: "Model",
      url: "model",
      subMenu: [
        { title: "Add Model", url: "", subMenu: ["Add One", "Add Multiple"] },
        { title: "Delete Model", url: "delete", subMenu: [] },
      ],
    },
    {
      title: "Field",
      url: "field",
      subMenu: [
        { title: "Add Field", subMenu: ["Add One", "Add Multiple"] },
        { title: "Delete Field", url: "delete", subMenu: [] },
      ],
    },
  ];

  return <></>
};

export default NavbarTwo;
