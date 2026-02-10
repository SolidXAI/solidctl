
import { BackButton } from "../../../components/common/BackButton";
import { CancelButton } from "../../../components/common/CancelButton";
import { SolidBreadcrumb } from "../../../components/common/SolidBreadcrumb";
import { SolidFormHeader } from "../../../components/common/SolidFormHeader";
import { SolidFormStepper } from "../../../components/common/SolidFormStepper";
import { ERROR_MESSAGES } from "../../../constants/error-messages";
import { useRegisterPrivateMutation, useUpdateUserMutation } from "../../../redux/api/authApi";
import { useGetrolesQuery } from "../../../redux/api/roleApi";
import { useDeleteUserMutation } from "../../../redux/api/userApi";
import { FetchBaseQueryError } from "@reduxjs/toolkit/dist/query";
import { useFormik } from "formik";
import { usePathname } from "../../../hooks/usePathname";
import { useRouter } from "../../../hooks/useRouter";
import { Button } from "primereact/button";
import { Checkbox } from "primereact/checkbox";
import { Divider } from "primereact/divider";
import { InputText } from "primereact/inputtext";
import { Message } from "primereact/message";
import { Panel } from "primereact/panel";
import { Password } from "primereact/password";
import { Toast } from "primereact/toast";
import { classNames } from "primereact/utils";
import { useEffect, useRef, useState } from "react";
import * as Yup from "yup";


interface ErrorResponseData {
  message: string;
  statusCode: number;
  error: string;
}

const CreateUser = ({ data, params }: any) => {

  const toast = useRef<Toast>(null);
  const pathname = usePathname();
  const router = useRouter();
  const [selectedRoles, setSelectedRoles] = useState<string[]>([]);

  const [registerPrivate, { isLoading, error: userCreateError, isSuccess, data: user }] = useRegisterPrivateMutation();
  const [
    updateUser,
    {
      isLoading: isuserUpdating,
      isSuccess: isUpdateuserSuceess,
      isError: isuserUpdateError,
      error: userUpdateError,
      data: updateduser,
    },
  ] = useUpdateUserMutation();

  const [deleteUser, {
    isLoading: isUserDeleted,
    isSuccess: isDeleteUserSuceess,
    isError: isUserDeleteError,
    error: UserDeleteError,
    data: DeletedUser,
  },] = useDeleteUserMutation();

  const { data: rolesData } = useGetrolesQuery("");
  // const [
  //   createrolebulk,
  //   { isLoading, isSuccess, isError, error, data: roles },
  // ] = useCreateuserrolebulkMutation();

  useEffect(() => {
    if (data && data.roles) {
      const userRoles = data.roles.map((role: any) => role.name);
      setSelectedRoles(userRoles);
    }
  }, [data]);

  const handleCheckboxChange = (roleName: string) => {
    let updatedRoles;
    if (selectedRoles.includes(roleName)) {
      updatedRoles = selectedRoles.filter((name) => name !== roleName);
    } else {
      updatedRoles = [...selectedRoles, roleName];
    }
    setSelectedRoles(updatedRoles);
    formik.setFieldTouched('roles', true); // fake "touched"
    formik.setFieldValue('roles', updatedRoles);
  };

  const initialValues = {
    fullName: data ? data.fullName : "",
    username: data ? data.username : "",
    email: data ? data.email : "",
    mobile: data ? data.mobile : "",
    password: "",
    confirmPassword: "",
  };

  const validationSchema = Yup.object({
    fullName: Yup.string().required(),
    username: Yup.string()
      .required('Username is required'), // Must be provided
    // .min(3, 'Username must be at least 3 characters long') // Minimum length
    // .max(20, 'Username cannot be longer than 20 characters') // Maximum length
    // .matches(
    //   /^[a-zA-Z0-9_.-]*$/,
    //   'Username can only contain letters, numbers, underscores, periods, and hyphens'
    // ) // Allowed characters
    // .matches(
    //   /^[a-zA-Z]/,
    //   'Username must start with a letter'
    // ),
    email: Yup
      .string()
      .email(ERROR_MESSAGES.FIELD_INVALID('email address'))
      .required(ERROR_MESSAGES.FIELD_REUQIRED('Email')),
    password: Yup.string().min(6, ERROR_MESSAGES.PASSWORD_CHARACTER(6)).nullable(),
    confirmPassword: Yup.string()
      .when('password', {
        is: (val: any) => !!val, // only validate if password is filled
        then: (schema) =>
          schema
            .oneOf([Yup.ref('password')], ERROR_MESSAGES.FIELD_MUST_MATCH('Password'))
            .nullable(),
        otherwise: (schema) => schema.notRequired().nullable(),
      }),
    mobile: Yup.number().required(ERROR_MESSAGES.FIELD_REUQIRED('Mobile')),
  });


  const isFormFieldValid = (formik: any, fieldName: string) => {
    return formik.touched[fieldName] && formik.errors[fieldName];
  };


  const showError = async (submit?: boolean) => {
    const errors = await formik.validateForm();
    const errorMessages = Object.values(errors);

    if (errorMessages.length > 0 && toast.current) {
      toast.current.show({
        severity: "error",
        summary: ERROR_MESSAGES.SEND_REPORT,
        // sticky: true,
        life: 3000,
        //@ts-ignore
        content: (props) => (
          <div
            className="flex flex-column align-items-left"
            style={{ flex: "1" }}
          >
            {errorMessages.map((m: any, index: number) => (
              <div className="flex align-items-center gap-2" key={index}>
                <span className="font-bold text-900">{m}</span>
              </div>
            ))}
          </div>
        ),
      });
    }
  };

  function isFetchBaseQueryErrorWithErrorResponse(error: any): error is FetchBaseQueryError & { data: ErrorResponseData } {
    return error && typeof error === 'object' && 'data' in error && 'message' in error.data;
  }

  useEffect(() => {
    const handleError = (errorToast: any) => {
      let errorMessage: any = [ERROR_MESSAGES.ERROR_OCCURED];

      if (isFetchBaseQueryErrorWithErrorResponse(errorToast)) {
        errorMessage = errorToast.data.message;
      } else {
        errorMessage = [ERROR_MESSAGES.SOMETHING_WRONG];
      }

      toast.current?.show({
        severity: 'error',
        summary: ERROR_MESSAGES.ERROR,
        detail: errorMessage,
        sticky: true,
        //@ts-ignore
        content: (props) => (
          <div className="flex flex-column align-items-left" style={{ flex: "1" }}>
            {Array.isArray(errorMessage) ? (
              errorMessage.map((message, index) => (
                <div className="flex align-items-center gap-2" key={index}>
                  <span className="font-bold text-900">{message.trim()}</span>
                </div>
              ))
            ) : (
              <div className="flex align-items-center gap-2">
                <span className="font-bold text-900">{errorMessage?.trim()}</span>
              </div>
            )}
          </div>
        ),
      });
    };

    // Check and handle errors from each API operation
    if (userCreateError) {
      handleError(userCreateError)
    }
    if (userUpdateError) {
      handleError(userUpdateError)
    }

  }, [
    userCreateError, userUpdateError
  ]);


  const formik = useFormik({
    initialValues,
    validationSchema,
    enableReinitialize: true,
    onSubmit: async (values) => {
      if (data) {
        const userData: any = {
          fullName: values.fullName,
          username: values.username,
          email: values.email,
          mobile: values.mobile,
          roles: selectedRoles,
        };
        if (values.password) {
          userData.password = values.password;
        }
        updateUser({ id: data.id, data: userData });

      } else {
        const userData = {
          fullName: values.fullName,
          username: values.username,
          email: values.email,
          mobile: values.mobile,
          password: values.password,
          roles: selectedRoles,
        };

        registerPrivate(userData)
      }
    },
  });

  useEffect(() => {
    if (isSuccess == true || isDeleteUserSuceess === true || isUpdateuserSuceess === true) {
      router.back();
    }
  }, [isSuccess, isDeleteUserSuceess, isUpdateuserSuceess])

  return (
    <div className="solid-form-wrapper">
      <Toast ref={toast} />
      <div className="solid-form-section" >
        <form onSubmit={formik.handleSubmit}>
          <div className="solid-form-header">
            {params.id === "new" ? (
              <>
                <div className="flex align-items-center gap-3">
                  <BackButton />
                  <div className="form-wrapper-title">Create User</div>
                </div>
                <div className="gap-3 flex">
                  {formik.dirty &&
                    <Button label="Save" size="small" type="submit" />
                  }
                  <CancelButton />
                </div>
              </>
            ) : (
              <>
                <div className="flex align-items-center gap-3">
                  <BackButton />
                  <div className="form-wrapper-title">Update User</div>
                </div>
                <div>
                  <div className="gap-3 flex">
                    {formik.dirty &&
                      <Button label="Save" size="small" type="submit" />
                    }
                    {data &&
                      <Button outlined label="Delete" size="small" severity="danger" type="button" onClick={() => deleteUser(data.id)} />
                    }
                    <CancelButton />
                  </div>
                </div>
              </>
            )}
          </div>
          <SolidFormHeader />
          {/* <div className="solid-form-stepper">
          <SolidFormStepper />
        </div> */}
          <div className="px-4 py-3 md:p-4 solid-form-content">
            <div className="grid">
              <div className="col-12 lg:col-10 xl:col-8 mx-auto">
                {/* <p className="form-wrapper-heading text-base">Basic Info</p> */}
                <Panel header="Basic Info" className="solid-column-panel">
                  <div className="grid formgrid mt-3">
                    <div className="field col-12 md:col-6 flex flex-column gap-2">
                      <label htmlFor="fullName" className="form-field-label">
                        Full Name
                      </label>
                      <InputText
                        type="text"
                        id="fullName"
                        name="fullName"
                        autoComplete={"off"}
                        onChange={formik.handleChange}
                        value={formik.values.fullName}
                        className={classNames("", {
                          "p-invalid": formik.touched.fullName && formik.errors.fullName,
                        })}
                      />
                      {isFormFieldValid(formik, "fullName") && (
                        <Message
                          severity="error"
                          text={formik?.errors?.fullName?.toString()}
                        />
                      )}
                    </div>
                    <div className="field col-12 md:col-6 flex flex-column gap-2 mt-3 md:mt-3">
                      <label htmlFor="username" className="form-field-label">
                        Username
                      </label>
                      <InputText
                        type="text"
                        id="username"
                        name="username"
                        autoComplete={"off"}
                        disabled={data ? true : false}
                        onChange={formik.handleChange}
                        value={formik.values.username}
                        className={classNames("", {
                          "p-invalid": formik.touched.username && formik.errors.username,
                        })}
                      />
                      {isFormFieldValid(formik, "username") && (
                        <Message
                          severity="error"
                          text={formik?.errors?.username?.toString()}
                        />
                      )}
                    </div>
                    <div className="field col-12 md:col-6 flex flex-column gap-1 mt-4">
                      <label htmlFor="email" className="form-field-label">
                        Email
                      </label>
                      <InputText
                        type="text"
                        id="email"
                        name="email"
                        autoComplete={"off"}
                        disabled={data ? true : false}
                        onChange={formik.handleChange}
                        value={formik.values.email}
                        className={classNames("", {
                          "p-invalid": formik.touched.email && formik.errors.email,
                        })}
                      />
                      {isFormFieldValid(formik, "email") && (
                        <Message
                          severity="error"
                          text={formik?.errors?.email?.toString()}
                        />
                      )}
                    </div>
                    <div className="field col-12 md:col-6 flex flex-column gap-1 mt-4">
                      <label htmlFor="mobile" className="form-field-label">
                        Mobile
                      </label>
                      <InputText
                        type="text"
                        id="mobile"
                        name="mobile"
                        autoComplete={"off"}
                        onChange={formik.handleChange}
                        value={formik.values.mobile}
                        className={classNames("", {
                          "p-invalid": formik.touched.mobile && formik.errors.mobile,
                        })}
                      />
                      {isFormFieldValid(formik, "mobile ") && (
                        <Message
                          severity="error"
                          text={formik?.errors?.mobile?.toString()}
                        />
                      )}
                    </div>
                    {params.id === "new" && <>
                      <div className="field col-12 md:col-6 flex flex-column gap-2 py-4">
                        <label htmlFor="Password" className="form-field-label">
                          Password
                        </label>
                        <Password
                          id="password"
                          name="password"
                          autoComplete="off"
                          aria-autocomplete="none"
                          value={formik.values.password}
                          onChange={formik.handleChange}
                          onBlur={formik.handleBlur}
                          toggleMask
                          invalid={isFormFieldValid(formik, "password")}
                          inputClassName="w-full"
                          feedback={false}
                        />
                        {isFormFieldValid(formik, "password") && (
                          <Message
                            severity="error"
                            text={formik?.errors?.password?.toString()}
                          />
                        )}
                      </div>
                      <div className="field col-12 md:col-6 flex flex-column gap-2 pb-4 md:pb-0 md:my-4">
                        <label htmlFor="Confirm Password" className="form-field-label">
                          Confirm Password
                        </label>
                        <Password
                          id="confirmPassword"
                          name="confirmPassword"
                          autoComplete="off"
                          aria-autocomplete="none"
                          value={formik.values.confirmPassword}
                          onChange={formik.handleChange}
                          onBlur={formik.handleBlur}
                          toggleMask
                          invalid={isFormFieldValid(formik, "confirmPassword")}
                          inputClassName="w-full"
                          feedback={false}
                        />
                        {isFormFieldValid(formik, "confirmPassword") && (
                          <Message
                            severity="error"
                            text={formik?.errors?.confirmPassword?.toString()}
                          />
                        )}
                      </div>
                    </>}
                  </div>
                </Panel>

                {/* <Divider /> */}
                {/* <p className="form-wrapper-heading text-base" style={{ fontSize: 16 }}>Roles</p> */}

                <Panel toggleable header="Roles" className="solid-column-panel mt-5">
                  <div className="formgrid grid mt-4">
                    {rolesData?.data?.records && rolesData?.data?.records.map((role: any, i: number) => (
                      <div key={role.name} className={`field col-6 flex gap-2 ${i >= 2 ? 'mt-3' : ''}`}>
                        <Checkbox
                          inputId={role.name}
                          checked={selectedRoles.includes(role.name)}
                          onChange={() => handleCheckboxChange(role.name)}
                        />
                        <label htmlFor={role.name}> {role.name}</label>
                      </div>
                    ))}
                  </div>
                </Panel>
              </div>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
};


export default CreateUser;
