import { env } from "../../adapters/env";

const AuthBanner = () => {
  return (
    <div
      style={{
        position: "relative",
        width: "100%",
        height: "calc(100vh)",
        background: 'url(/images/loginhero.png)',
        // background: 'url(/images/LoginBanner.png)',
        backgroundSize: 'cover',
        marginTop: env("ENABLE_CUSTOM_HEADER_FOOTER") === "true" ? 70 : 0
      }}
      className="flex align-items-center"
    >
      <div className="grid m-0">
        <div className="col-8 mx-auto">
          <div className="text-5xl text-white font-semibold line-height-3">
            {env("SOLID_APP_TITLE")}
          </div>
          <div className="text-sm text-white line-height-3">
            {env("NEXT_PUBLIC_SOLID_APP_DESCRIPTION")}
          </div>
          <div className="mt-5">
            {/* <AvatarGroup>
              <Avatar image="/images/AvatarDemo.png" size="large" shape="circle" />
              <Avatar image="/images/AvatarDemo.png" size="large" shape="circle" />
              <Avatar image="/images/AvatarDemo.png" size="large" shape="circle" />
              <Avatar image="/images/AvatarDemo.png" size="large" shape="circle" />
              <Avatar image="/images/AvatarDemo.png" size="large" shape="circle" />
              <Avatar label="60k+" shape="circle" size="large" className="text-sm text-bold" style={{ color: '#191866', backgroundColor: '#fff' }} />
            </AvatarGroup> */}
          </div>
        </div>
      </div>
    </div>
  );
};

export default AuthBanner;
