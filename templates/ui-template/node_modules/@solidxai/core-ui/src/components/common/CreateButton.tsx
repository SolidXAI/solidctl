

import { usePathname } from "../../hooks/usePathname";
import { useRouter } from "../../hooks/useRouter";
import { Button } from 'primereact/button';

export const CreateButton = () => {
    const router = useRouter();
    const pathName = usePathname();

    const createPAth = pathName.split('/').slice(0, -1).join('/') + '/create';

    return (
        <div>
            <Button type="button" label="Add" size='small' onClick={() => router.push(createPAth)} className='small-button' />
        </div>
    )
}
