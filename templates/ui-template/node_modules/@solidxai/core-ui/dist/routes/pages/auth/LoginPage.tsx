import SolidLogin from "../../../components/auth/SolidLogin";

export function LoginPage() {
  return (
    <SolidLogin
      signInValidatorLabel="Username"
      signInValidatorPlaceholder="Enter your username"
    />
  );
}
