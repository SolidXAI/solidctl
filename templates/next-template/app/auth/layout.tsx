import { AuthLayout } from "@solidx/solid-core-ui";

const AuthLayoutContainer = ({ children }: { children: React.ReactNode }) => {
    return (
        <AuthLayout>
            {children}
        </AuthLayout>
    )
}
export default AuthLayoutContainer