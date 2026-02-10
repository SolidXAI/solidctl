import * as React from "react"
const FileSvg = (props: React.SVGProps<SVGSVGElement>) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    width={64}
    height={64}
    fill="none"
    {...props}
    className="solid-file-reader"
  >
    <path
      fill="#F9F0FF"
      d="M36.03 25.291a2 2 0 0 1-2-2V6.271H16a6 6 0 0 0-6 6v40.08a6 6 0 0 0 6 6h31.06a6.01 6.01 0 0 0 6-6v-27.06H36.03Z"
    />
    <path fill="#722ED1" d="M51.88 21.291 38.03 7.441v13.85h13.85Z" />
  </svg>
)
export default FileSvg
