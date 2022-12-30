
import classNames from 'classnames';
import React from 'react';
import { createUseStyles } from 'react-jss';

const useStyles = createUseStyles({
    root: {
        border: '1px solid #dee0e1',
        padding: 5,
        margin: 5,
        width: '100%',
        borderRadius: 2
    },
});

type Props = {
    children?: JSX.Element | JSX.Element[];
    className?: any;
}

export const Box = (props: Props) => {
    const classes = useStyles();
    return (
        <div className={classNames(classes.root, props.className)}>
            {props.children}
        </div>
    )
}