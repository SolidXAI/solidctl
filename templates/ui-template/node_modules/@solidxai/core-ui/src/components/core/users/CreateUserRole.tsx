
import { AutoCompleteField } from "../../../components/common/AutoCompleteField";
import { CancelButton } from "../../../components/common/CancelButton";
import { ERROR_MESSAGES } from "../../../constants/error-messages";
import { useLazyGetrolesQuery } from "../../../redux/api/roleApi";
import { useCreateuserroleMutation } from "../../../redux/api/userApi";
import { useFormik } from "formik";
import { usePathname } from "../../../hooks/usePathname";
import { useRouter } from "../../../hooks/useRouter";
import { Button } from "primereact/button";
import { InputText } from "primereact/inputtext";
import { Message } from "primereact/message";
import { Toast } from "primereact/toast";
import { classNames } from "primereact/utils";
import qs from "qs";
import { useEffect, useRef } from "react";
import * as Yup from "yup";

const CreateUserRole = ({ data }: any) => {
  const toast = useRef<Toast>(null);

  const [triggerGetRoles, { data: roleLazy, isFetching: isRoleLazyFetching, error: roleLazyError }] = useLazyGetrolesQuery();
  const router = useRouter();

  const [
    createMenuItem,
    { isLoading, isSuccess, isError, error, data: newInvoice },
  ] = useCreateuserroleMutation();

  const initialValues = {
    username: data ? data.username : "",
    roleName: data ? data.roleName : ""
  };
  const validationSchema = Yup.object({
    username: Yup.string().required(ERROR_MESSAGES.FIELD_REUQIRED('User Name')),
    roleName: Yup.lazy((value) => {
      if (typeof value === 'object' && value !== null && !Array.isArray(value)) {
        return Yup.object().required(ERROR_MESSAGES.FIELD_REUQIRED('Role Name'));
      } else if (typeof value === 'string') {
        return Yup.string().required(ERROR_MESSAGES.FIELD_REUQIRED('Role Name'));
      } else {
        return Yup.mixed().required(ERROR_MESSAGES.FIELD_REUQIRED('Role Name'));
      }
    })
  });

  const isFormFieldValid = (formik: any, fieldName: string) =>
    formik.touched[fieldName] && formik.errors[fieldName];

  const pathname = usePathname();

  const formik = useFormik({
    initialValues,
    validationSchema,
    enableReinitialize: true,
    onSubmit: async (values) => {
      try {
        let obj = {
          username: values.username,
          roleName: values.roleName.label
        }
        createMenuItem(obj);
      } catch (err) {
        console.error(ERROR_MESSAGES.FAILED_CREATE_INVOICE, err);
      }
    },
  });

  const showError = async () => {
    const errors = await formik.validateForm();
    const errorMessages = Object.values(errors);

    if (errorMessages.length > 0) {
      toast?.current?.show({
        severity: "success",
        summary: ERROR_MESSAGES.SEND_REPORT,
        // sticky: true,
        life: 3000,
        //@ts-ignore
        content: (props) => (
          <div
            className="flex flex-column align-items-left"
            style={{ flex: "1" }}
          >
            {errorMessages.map((m, index) => (
              <div className="flex align-items-center gap-2" key={index}>
                <span className="font-bold text-900">{String(m)}</span>
              </div>
            ))}
          </div>
        ),
      });
    }
  };

  const searchRole = async (event: any) => {
    const query = event.query;
    let queryData = {};
    if (query) {
      queryData = {
        roleName: query
      };
    }

    const queryString = qs.stringify(queryData, {
      encodeValuesOnly: true
    });

    // Trigger the API call manually
    const result = await triggerGetRoles(queryString).unwrap();

    // Map the API response to AutoComplete format
    if (result && result.data) {
      const filteredMenu = result.data.map((m: any) => ({ label: m.name, value: m.id }));

      // Update the suggestions in state
      return filteredMenu
    } else {
      // Handle the case where no data is returned
      return []
    }
  };

  useEffect(() => {
    if (isSuccess == true) {
      router.push(`/admin/iam/users/all`);
    }
  }, [isSuccess])

  return (
    <div className="grid">
      <div className="col-12 xl:col-10 mx-auto">
        <div>
          {/* <Toast ref={toast} /> */}

          <form onSubmit={formik.handleSubmit}>
            {pathname.includes('create') ? <div className="flex gap-3 justify-content-between mb-5">
              <div className="form-wrapper-title"> Create User Role</div>
              <div className="gap-3 flex">
                <div>
                  <Button label="Save" size="small" onClick={() => showError()} type="submit" className='small-button' />
                </div>
                <CancelButton />
              </div>
            </div> :
              <div className="flex gap-3 justify-content-between mb-5">
                <h1 className="m-0"> Edit User</h1>
                <div className="gap-3 flex">
                  <div>
                    <Button label="Save" onClick={() => showError()} type="submit" size="small" className='small-button' />
                  </div>
                  <div>
                    {/* <Button label="Delete" severity="danger" type="button" /> */}
                  </div>
                  <CancelButton />
                </div>
              </div>
            }
            <div className="form-wrapper">
              <div className="grid formgrid">
                <div className="md:col-6 sm:col-12">
                  <div className="field">
                    <label htmlFor="username" className="form-label form-field-label">
                      User Name
                    </label>
                    <InputText
                      type="text"
                      id="username"
                      name="username"
                      onChange={formik.handleChange}
                      value={formik.values.username}
                      className={classNames("p-inputtext-sm w-full small-input", {
                        "p-invalid": isFormFieldValid(formik, "username"),
                      })}
                    />
                    {isFormFieldValid(formik, "username") && (
                      <Message severity="error" text={formik.errors.username?.toString()} />
                    )}
                  </div>
                </div>
                <div className="md:col-6 sm:col-12">
                  <div className="field">
                    <label htmlFor="type" className="form-label form-field-label">
                      Role Name
                    </label>
                    <div>
                      <AutoCompleteField
                        multiple={false}
                        isFormFieldValid={isFormFieldValid}
                        formik={formik}
                        fieldName="roleName"
                        searchData={searchRole}
                        existingData={{ label: data?.parentCategory?.title, value: data?.parentCategory?.id }}
                        existingDataTitle={data?.parentCategory?.title}
                        existingDataId={data?.parentCategory?.id}
                        className="solid-standard-autocomplete"
                      ></AutoCompleteField>
                      {isFormFieldValid(formik, "roleName") && (
                        <Message severity="error" text={formik?.errors?.roleName?.toString()} />
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

export default CreateUserRole;
