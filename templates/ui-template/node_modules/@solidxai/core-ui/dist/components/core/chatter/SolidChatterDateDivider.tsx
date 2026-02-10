
import styles from './chatter.module.css';

interface Props {
    date: string;
}

export const SolidChatterDateDivider = ({ date }: Props) => {
    return (
        <div className={styles.chatterDatetimeDivider}>
            <div className={`${styles.chatterDividerContent} absolute`}>
                {date}
            </div>
        </div>
    )
}