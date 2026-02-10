
import FileSvg from '../Svg/FileSvg'

export const FileReaderExt = ({ fileDetails }: { fileDetails: any }) => {
    const renderFile = () => {
        const type = fileDetails.type
        switch (type) {
            case "image/png":
                return '/images/fileReader/image-jpg.png'
            default:
                return '/images/fileReader/image-jpg.png'
        }
    }
    return (
        <div>
            <FileSvg />
            {/* <img src={renderFile()} style={{height: 50, width:50}}/> */}
        </div>
    )
}