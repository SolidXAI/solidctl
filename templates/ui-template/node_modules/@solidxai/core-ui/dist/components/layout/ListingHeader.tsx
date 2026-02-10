
import { Menu } from "primereact/menu";
import React, { useRef, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
// import { RootState } from "../../redux/store";
import { gridView, listView } from "../../redux/features/dataViewSlice";
import { usePathname } from "../../hooks/usePathname";
import { useRouter } from "../../hooks/useRouter";
import { HeaderDynamicTitles } from "../common/HeaderDynamicTitles";
import FilterMenu from "./FilterMenu";

const ListingHeader = () => {
  const dispatch = useDispatch();
  const router = useRouter();
  const pathname = usePathname();


  const visibleFieldsPopup = useSelector(
    (state: any) => state.popup.visibleFieldsPopup
  );

  const menu = useRef<Menu>(null);
  const items = [
    {
      label: "Settings",
      icon: "pi pi-cog",
      command: () => {
      },
    },
    {
      label: "Update",
      icon: "pi pi-refresh",
      command: () => {
      },
    },
    {
      label: "Delete",
      icon: "pi pi-trash",
      command: () => {
      },
    },
  ];
  const [value, setValue] = useState(null);
  const contextMenuOptions = [
    {
      label: (
        <div id="kanban" onClick={() => dispatch(gridView())}>
          <img
            src="/images/icons/icon-kanban.svg"
            style={{ width: "18px", height: "18px" }}
          />
        </div>
      ),
      value: "kanban",
      tooltip: "Kanban",
    },
    {
      label: (
        <div id="list_view" onClick={() => dispatch(listView())}>
          <img
            src="/images/icons/icon-list.svg"
            style={{ width: "18px", height: "18px" }}
          />
        </div>
      ),
      value: "list_view",
      tooltip: "List view",
    },
    {
      label: (
        <div id="calender">
          <img
            src="/images/icons/icon-calender.svg"
            style={{ width: "18px", height: "18px" }}
          />
        </div>
      ),
      value: "calender",
      tooltip: "Calender",
    },
    {
      label: (
        <div id="activity">
          <img
            src="/images/icons/icon-activity.svg"
            style={{ width: "18px", height: "18px" }}
          />
        </div>
      ),
      value: "activity",
      tooltip: "Activity",
    },
    {
      label: (
        <div id="graph">
          <img
            src="/images/icons/icon-graph.svg"
            style={{ width: "18px", height: "18px" }}
          />
        </div>
      ),
      value: "graph",
      tooltip: "Graph",
    },
  ];

  const justifyTemplate = (option: any) => {
    return <i className={option.icon}></i>;
  };


  const save = () => {
    const pathName = window.location.pathname;
    const newPath = pathName.split('/').slice(0, -1).join('/') + '/create';

    router.push(newPath);



    // switch (pathParts[3]) {
    //   case "model":
    //     dispatch(showFieldsPopup());
    //     break;
    //   case "module":
    //     dispatch(showModulePopup());
    //     break;
    // }
  };

  const toggleMenu = (e: React.MouseEvent<HTMLButtonElement, MouseEvent>) => {
    if (menu.current) {
      menu.current.toggle(e);
    }
  };



  return (
    <>
      <div
        className="flex justify-content-between align-items-center px-5 relative lg:static"
        style={{ height: "60px", minHeight: 60, backgroundColor: '#f6f6f9' }}
      >
        <div className="flex align-items-center">
          {/* <i className="pi pi-users" style={{backgroundColor:"#1D6CBC"}}></i> */}
          {/* <img src="/images/icons/icon-users.svg" />
                <span className="listHead ml-2">Employees</span> */}
          <div className="">
            {/* <SplitButton
              label="Add"
              icon="pi pi-plus"
              onClick={save}
              model={items}
              severity="info"
              className="small-splitbutton"
            /> */}
            {pathname.includes('all') &&
              <HeaderDynamicTitles />
            }
          </div>
        </div>
        {/* <GlobalSearch /> */}
        <div className="flex align-items-center">

          {/* <Button label="Show" icon="pi pi-external-link" onClick={() => setVisible(true)} /> */}

          <div>
            {/* <Menu model={items} popup ref={menu} /> */}
            {pathname == "/admin/address-master/states" &&
              <FilterMenu></FilterMenu>

            }
            {/* <Button
              icon="pi pi-cog"
              className="transparent-background"
              onClick={toggleMenu}
              aria-haspopup
              aria-controls="popup_menu"
            /> */}
          </div>
        </div>
        <div className="flex align-items-center">
          {/* <div>
            {contextMenuOptions.map((option) => (
              <Tooltip
                key={option.value}
                target={`#${option.value}`}
                content={option.tooltip}
                className="custom-tooltip"
              />
            ))}
            <SelectButton
              value={value}
              onChange={(e) => setValue(e.value)}
              options={contextMenuOptions}
              className="custom-select-button"
            />
          </div> */}
        </div>
      </div>
      {/* <CreateModule></CreateModule> */}
    </>
  );
};
export default ListingHeader;
