import { SolidLogin } from "@solidxai/core-ui";

export function VenueAppLoginPage() {
  return (
    <SolidLogin
      signInValidatorLabel="Mobile / SAP Code / Dhan Code"
      signInValidatorPlaceholder="Enter any one of Mobile / SAP Code / Dhan Code"
    />
  );
}
