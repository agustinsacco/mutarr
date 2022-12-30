
import classNames from 'classnames';
import React from 'react';
import { createUseStyles } from 'react-jss';

const useStyles = createUseStyles({
    root: {
        border: '1px solid #eceded',
        backgroundColor: '#bfc3c4',
        color: '#FFF',
        borderRadius: 20,
        padding: {
            top: 3,
            left: 5,
            right: 5,
            bottom: 3
        }
    },
});

type Props = {
    children?: JSX.Element | JSX.Element[];
    className?: any;
}

export const Badge = (props: Props) => {
    const classes = useStyles();
    return (
        <div className={classNames(classes.root, props.className)}>
            {props.children}
        </div>
    )
}