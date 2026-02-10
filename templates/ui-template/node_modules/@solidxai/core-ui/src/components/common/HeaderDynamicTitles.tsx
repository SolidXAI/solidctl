

import { usePathname } from "../../hooks/usePathname";
export const HeaderDynamicTitles = () => {
    const path = usePathname();
    const getHeading = path.split('/').slice(-2, -1)[0].replace(/-/g, ' ').replace(/\b\w/g, char => char.toUpperCase());

    return (
        <div className='text-xl font-bold'>
            All {getHeading}s
        </div>
    )
}
