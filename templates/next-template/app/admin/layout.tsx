import { AdminLayout } from "@solidxai/core-ui";
const layout = ({ children }: { children: React.ReactNode }) => {

  return (
    <AdminLayout>
      {children}
    </AdminLayout>
  );
};

export default layout;
