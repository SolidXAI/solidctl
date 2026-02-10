

import Link from "../common/Link";
import { usePathname } from "../../hooks/usePathname";
import { useState } from "react";

const AdminSidebar = () => {
  const pathname = usePathname();

  const menuItem = [
    {
      name: "Dashboard",
      url: "/admin/dashboard",
      icon: "fas fa-tachometer-alt",
    },
    {
      name: "Rooms",
      url: "/admin/rooms",
      icon: "fas fa-hotel",
    },
    {
      name: "Bookings",
      url: "/admin/bookings",
      icon: "fas fa-receipt",
    },
    {
      name: "Users",
      url: "/admin/users",
      icon: "fas fa-user",
    },
    {
      name: "Reviews",
      url: "/admin/reviews",
      icon: "fas fa-star",
    },
  ];

  const [activeMenuItem, setActiveMenuItem] = useState(pathname);

  const handleMenuItemClick = (menuItem: string) => {
    setActiveMenuItem(menuItem);
  };

  return (
    <div className="list-group mt-5 pl-4">
      {menuItem.map((menuItem, index) => (
        <Link
          key={index}
          href={menuItem.url}
          className={`fw-bold list-group-item list-group-item-action ${activeMenuItem.includes(menuItem.url) ? "active" : ""
            }`}
          onClick={() => handleMenuItemClick(menuItem.url)}
          aria-current={
            activeMenuItem.includes(menuItem.url) ? "true" : "false"
          }
        >
          <i className={`${menuItem.icon} fa-fw pe-2`}></i> {menuItem.name}
        </Link>
      ))}
    </div>
  );
};

export default AdminSidebar;
