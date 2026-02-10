
// import { useAppSelector } from "../../redux/hooks";
import { PrimeReactContext } from "primereact/api";
import { OverlayPanel } from "primereact/overlaypanel";
import { useContext, useEffect, useRef, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { LayoutContext } from "./context/layoutcontext";
import { LayoutConfig } from "../../types";
import { toggleTheme } from "../../redux/features/themeSlice";
import { InputSwitch } from "primereact/inputswitch";
import { Button } from "primereact/button";
import { Dialog } from "primereact/dialog";
import { Divider } from "primereact/divider";
import { Avatar } from "primereact/avatar";
import { SolidAccountSettings } from "../core/common/SolidAccountSettings/SolidAccountSettings";
import { useGetUserQuery } from "../../redux/api/userApi";
import { handleLogout } from "../../adapters/auth/handleLogout";
import { Toast } from "primereact/toast";
import { useLazyGetSolidSettingsQuery } from "../../redux/api/solidSettingsApi";
import { useSession } from "../../hooks/useSession";

const UserProfileMenu = () => {
  const toast = useRef(null);
  const [showProfileSettingsDialog, setShowProfileSettingsDialog] = useState(false);
  const [trigger, { data: solidSettingsData }] = useLazyGetSolidSettingsQuery();

  useEffect(() => {
    trigger("") // Fetch settings on mount
  }, [trigger])

  const { changeTheme } = useContext(PrimeReactContext);
  const { layoutConfig, setLayoutConfig } = useContext(LayoutContext);
  const { theme } = useSelector((state: any) => state.theme); // Get current theme from Redux

  const session = useSession();
  const userId = session?.data?.user?.id;

  const { data: userData } = useGetUserQuery(userId, {
    skip: !userId,
  });
  const [checked, setChecked] = useState(theme === "dark");
  const [confirmLogout, setConfirmLogout] = useState(false);
  const dispatch = useDispatch();
  const op = useRef(null);
  const _changeTheme = (theme: string, colorScheme: string) => {
    changeTheme?.(layoutConfig.theme, theme, 'theme-css', () => {
      setLayoutConfig((prevState: LayoutConfig) => ({ ...prevState, theme, colorScheme }));
    });
  };

  const handleThemeToggle = (e: any) => {
    const isDarkMode = e.value;
    setChecked(isDarkMode);
    dispatch(toggleTheme()); // Dispatch Redux action
    _changeTheme(isDarkMode ? "solid-dark-purple" : "solid-light-purple", isDarkMode ? "dark" : "light");
  };

  const getInitials = (value: string) => {
    if (!value) return "";

    const email = value.includes('@') ? value.split('@')[0] : value;
    return email[0]?.toUpperCase() || "";
  };

  const getColorFromInitials = (initials: string) => {
    let hash = 0;
    for (let i = 0; i < initials.length; i++) {
      hash = initials.charCodeAt(i) + ((hash << 5) - hash);
    }
    const hue = Math.abs(hash) % 360;
    return `hsl(${hue}, 60%, 60%)`;
  };


  const value = userData?.data?.email;
  const initials = getInitials(value);
  const bgColor = getColorFromInitials(initials);

  const UserProfileAvatar = () => {
    return (
      userData?.data?._media?.profilePicture?.[0]?._full_url ?
        <Avatar
          image={userData?.data?._media?.profilePicture?.[0]?._full_url}
          shape="circle"
          size="large"
        />
        :
        <Avatar
          label={initials}
          size="large"
          shape="circle"
          style={{ backgroundColor: bgColor, color: '#ffffff' }}
        />
    )
  }
  return (
    <div className="userProfile">
      <Toast ref={toast} />
      <div
        className="">
        <div
          className="flex align-items-end"
          //@ts-ignore
          onClick={(e: any) => op?.current?.toggle(e)}
        >
          {/* <Image
            src={AvatarImage}
            alt="Solid"
            className="profile-icon relative"
            fill
          /> */}
          <UserProfileAvatar />
          <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 14 14" fill="none">
            <path d="M7 5.83301L3.5 9.33301H10.5L7 5.83301Z" fill="var(--solid-primary-black)" />
          </svg>
        </div>
        <OverlayPanel ref={op} className="user-profile-panel">
          <div className="flex align-items-center p-3 gap-2 secondary-border-bottom">
            {/* <Image
              alt="avatar"
              src={AvatarImage}
              className="w-2rem relative"
              fill
            /> */}
            <UserProfileAvatar />
            <div className="flex flex-column align">
              {solidSettingsData?.data?.enableUsername ?
                <span className="font-bold">{userData?.data?.username}</span>
                :
                <span className="mt-1">{userData?.data?.email}</span>
              }
              <span className="mt-1 font-medium">
                {userData?.data?.roles
                  ?.filter((role: any) => role.name !== "Internal User")
                  .map((role: any) => role.name)
                  .join(" | ")}
              </span>
            </div>
          </div>

          {/* Disabled the dark mode toggle for now */}
          {/* 
          {solidSettingsData?.data?.enableDarkMode === true &&
            <div className="p-3 flex align-items-center justify-content-between secondary-border-bottom">
              <div className="flex align-items-center gap-3">
                <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 18 18" fill="none">
                  <path d="M9 18C6.5 18 4.375 17.125 2.625 15.375C0.875 13.625 0 11.5 0 9C0 6.5 0.875 4.375 2.625 2.625C4.375 0.875 6.5 0 9 0C9.23333 0 9.4625 0.00833333 9.6875 0.025C9.9125 0.0416667 10.1333 0.0666667 10.35 0.1C9.66667 0.583333 9.12083 1.2125 8.7125 1.9875C8.30417 2.7625 8.1 3.6 8.1 4.5C8.1 6 8.625 7.275 9.675 8.325C10.725 9.375 12 9.9 13.5 9.9C14.4167 9.9 15.2583 9.69583 16.025 9.2875C16.7917 8.87917 17.4167 8.33333 17.9 7.65C17.9333 7.86667 17.9583 8.0875 17.975 8.3125C17.9917 8.5375 18 8.76667 18 9C18 11.5 17.125 13.625 15.375 15.375C13.625 17.125 11.5 18 9 18ZM9 16C10.4667 16 11.7833 15.5958 12.95 14.7875C14.1167 13.9792 14.9667 12.925 15.5 11.625C15.1667 11.7083 14.8333 11.775 14.5 11.825C14.1667 11.875 13.8333 11.9 13.5 11.9C11.45 11.9 9.70417 11.1792 8.2625 9.7375C6.82083 8.29583 6.1 6.55 6.1 4.5C6.1 4.16667 6.125 3.83333 6.175 3.5C6.225 3.16667 6.29167 2.83333 6.375 2.5C5.075 3.03333 4.02083 3.88333 3.2125 5.05C2.40417 6.21667 2 7.53333 2 9C2 10.9333 2.68333 12.5833 4.05 13.95C5.41667 15.3167 7.06667 16 9 16Z" fill="#1D6CBC" />
                </svg>
                <p className="m-0 font-bold">Dark Mode</p>
              </div>
              <InputSwitch checked={checked} onChange={handleThemeToggle} />
            </div>
          }
          */}
          <div className="flex align-items-center py-1 gap-2 secondary-border-bottom">
            <Button severity="secondary" text className="w-full flex align-items-center gap-2 px-3" onClick={() => setShowProfileSettingsDialog(true)}>
              <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 18 18" fill="none">
                <path d="M8.1191 16.5C7.7816 16.5 7.49098 16.3875 7.24723 16.1625C7.00348 15.9375 6.8566 15.6625 6.8066 15.3375L6.63785 14.1C6.47535 14.0375 6.32223 13.9625 6.17848 13.875C6.03473 13.7875 5.8941 13.6938 5.7566 13.5938L4.5941 14.0813C4.2816 14.2188 3.9691 14.2313 3.6566 14.1188C3.3441 14.0063 3.10035 13.8063 2.92535 13.5188L2.0441 11.9813C1.8691 11.6938 1.8191 11.3875 1.8941 11.0625C1.9691 10.7375 2.13785 10.4688 2.40035 10.2563L3.3941 9.50625C3.3816 9.41875 3.37535 9.33438 3.37535 9.25313V8.74688C3.37535 8.66563 3.3816 8.58125 3.3941 8.49375L2.40035 7.74375C2.13785 7.53125 1.9691 7.2625 1.8941 6.9375C1.8191 6.6125 1.8691 6.30625 2.0441 6.01875L2.92535 4.48125C3.10035 4.19375 3.3441 3.99375 3.6566 3.88125C3.9691 3.76875 4.2816 3.78125 4.5941 3.91875L5.7566 4.40625C5.8941 4.30625 6.03785 4.2125 6.18785 4.125C6.33785 4.0375 6.48785 3.9625 6.63785 3.9L6.8066 2.6625C6.8566 2.3375 7.00348 2.0625 7.24723 1.8375C7.49098 1.6125 7.7816 1.5 8.1191 1.5H9.8816C10.2191 1.5 10.5097 1.6125 10.7535 1.8375C10.9972 2.0625 11.1441 2.3375 11.1941 2.6625L11.3629 3.9C11.5254 3.9625 11.6785 4.0375 11.8222 4.125C11.966 4.2125 12.1066 4.30625 12.2441 4.40625L13.4066 3.91875C13.7191 3.78125 14.0316 3.76875 14.3441 3.88125C14.6566 3.99375 14.9004 4.19375 15.0754 4.48125L15.9566 6.01875C16.1316 6.30625 16.1816 6.6125 16.1066 6.9375C16.0316 7.2625 15.8629 7.53125 15.6004 7.74375L14.6066 8.49375C14.6191 8.58125 14.6254 8.66563 14.6254 8.74688V9.25313C14.6254 9.33438 14.6129 9.41875 14.5879 9.50625L15.5816 10.2563C15.8441 10.4688 16.0129 10.7375 16.0879 11.0625C16.1629 11.3875 16.1129 11.6938 15.9379 11.9813L15.0379 13.5188C14.8629 13.8063 14.6191 14.0063 14.3066 14.1188C13.9941 14.2313 13.6816 14.2188 13.3691 14.0813L12.2441 13.5938C12.1066 13.6938 11.9629 13.7875 11.8129 13.875C11.6629 13.9625 11.5129 14.0375 11.3629 14.1L11.1941 15.3375C11.1441 15.6625 10.9972 15.9375 10.7535 16.1625C10.5097 16.3875 10.2191 16.5 9.8816 16.5H8.1191ZM8.25035 15H9.7316L9.9941 13.0125C10.3816 12.9125 10.741 12.7656 11.0722 12.5719C11.4035 12.3781 11.7066 12.1438 11.9816 11.8688L13.8379 12.6375L14.5691 11.3625L12.9566 10.1438C13.0191 9.96875 13.0629 9.78438 13.0879 9.59063C13.1129 9.39688 13.1254 9.2 13.1254 9C13.1254 8.8 13.1129 8.60313 13.0879 8.40938C13.0629 8.21563 13.0191 8.03125 12.9566 7.85625L14.5691 6.6375L13.8379 5.3625L11.9816 6.15C11.7066 5.8625 11.4035 5.62188 11.0722 5.42813C10.741 5.23438 10.3816 5.0875 9.9941 4.9875L9.75035 3H8.2691L8.0066 4.9875C7.6191 5.0875 7.25973 5.23438 6.92848 5.42813C6.59723 5.62188 6.2941 5.85625 6.0191 6.13125L4.16285 5.3625L3.4316 6.6375L5.0441 7.8375C4.9816 8.025 4.93785 8.2125 4.91285 8.4C4.88785 8.5875 4.87535 8.7875 4.87535 9C4.87535 9.2 4.88785 9.39375 4.91285 9.58125C4.93785 9.76875 4.9816 9.95625 5.0441 10.1438L3.4316 11.3625L4.16285 12.6375L6.0191 11.85C6.2941 12.1375 6.59723 12.3781 6.92848 12.5719C7.25973 12.7656 7.6191 12.9125 8.0066 13.0125L8.25035 15ZM9.03785 11.625C9.76285 11.625 10.3816 11.3688 10.8941 10.8563C11.4066 10.3438 11.6629 9.725 11.6629 9C11.6629 8.275 11.4066 7.65625 10.8941 7.14375C10.3816 6.63125 9.76285 6.375 9.03785 6.375C8.30035 6.375 7.67848 6.63125 7.17223 7.14375C6.66598 7.65625 6.41285 8.275 6.41285 9C6.41285 9.725 6.66598 10.3438 7.17223 10.8563C7.67848 11.3688 8.30035 11.625 9.03785 11.625Z" fill="#4B4D52" />
              </svg>
              <span className="p-button-label flex-none">
                Account Settings
              </span>
            </Button>
          </div>
          {solidSettingsData?.data?.contactSupportEmail &&
            <div className="flex align-items-center py-1 gap-2 secondary-border-bottom">
              <Button severity="secondary" text className="w-full flex align-items-center gap-2 px-3 ml-1" onClick={() => window.location.href = `mailto:${solidSettingsData?.data?.contactSupportEmail}`} icon={solidSettingsData?.data?.contactSupportIcon || 'pi pi-envelope'}>
                <span className="p-button-label flex-none">
                  {solidSettingsData?.data?.contactSupportDisplayName || "Contact Support"}
                </span>
              </Button>
            </div>
          }
          <div className="py-1">
            <Button
              text
              severity="secondary"
              className="flex align-items-center gap-2 w-full px-3"
              onClick={() => setConfirmLogout(true)}
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 18 18" fill="none">
                <path d="M3.75 15.75C3.3375 15.75 2.98438 15.6031 2.69063 15.3094C2.39687 15.0156 2.25 14.6625 2.25 14.25V3.75C2.25 3.3375 2.39687 2.98438 2.69063 2.69063C2.98438 2.39687 3.3375 2.25 3.75 2.25H9V3.75H3.75V14.25H9V15.75H3.75ZM12 12.75L10.9688 11.6625L12.8813 9.75H6.75V8.25H12.8813L10.9688 6.3375L12 5.25L15.75 9L12 12.75Z" fill="#F04A4A" />
              </svg>
              <span className="p-button-label flex-none ">Logout</span>
            </Button>
          </div>
        </OverlayPanel>
      </div>
      <Dialog header="Logout" headerClassName="py-2" contentClassName="px-0 pb-0" className="solid-confirm-dialog" visible={confirmLogout} style={{ width: '20vw' }} onHide={() => { if (!confirmLogout) return; setConfirmLogout(false); }}
        footer={<div className="flex align-items-center gap-2">
          <Button label="Logout" size="small" onClick={() => handleLogout(toast)} />
          <Button label="Cancel" size="small" onClick={() => setConfirmLogout(false)} outlined />
        </div>}
      >
        <Divider className="m-0" />
        <div className="p-4">
          <p className="m-0 solid-primary-title" style={{ fontSize: 16 }}>
            Are you sure you want to log out?
          </p>
        </div>
      </Dialog>
      {showProfileSettingsDialog &&
        <SolidAccountSettings
          showProfileSettingsDialog={showProfileSettingsDialog}
          setShowProfileSettingsDialog={setShowProfileSettingsDialog}
        />
      }
    </div>
  );
};

export default UserProfileMenu;
