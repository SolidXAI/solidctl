 // Error components must be Client Components

interface CustomError extends Error {
  errMessage: string;
}

export default function Error({
  error,
  reset,
}: {
  error: CustomError;
  reset?: () => void;
}) {
  return (
    <div>
      <div className="d-flex justify-content-center align-items-center vh-100">
        <div className="text-center">
          <h2 className="display-4 fw-bold">{error?.errMessage}</h2>
          <p className="fs-3">
            <span className="text-danger">Opps!</span> Something went wrong!
          </p>
          <p className="lead">Sorry for inconvience</p>
          <button className="btn btn-primary" onClick={() => reset?.()}>
            Try again
          </button>
        </div>
      </div>
    </div>
  );
}
