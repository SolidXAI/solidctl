import { AdminLayout } from "@solidstarters/solid-core-ui";
const layout = ({ children }: { children: React.ReactNode }) => {

  return (
    <AdminLayout>
      {children}
    </AdminLayout>
  );
};

export default layout;
