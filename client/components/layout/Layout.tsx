
import React from 'react';
import { createUseStyles } from 'react-jss';
import { Header } from './Header';

const useStyles = createUseStyles({
    root: {
        height: 'auto',
        maxWidth: 1200,
        margin: '30px auto'
    },
    body: {
        margin: {
            top: 20,
            right: 50,
            left: 50
        }
    }
});

type Props = {
    children?: JSX.Element | JSX.Element[];
}

export const Layout = (props: Props) => {
    const classes = useStyles();
    return (
        <div className={classes.root}>
            <Header />
            <div className={classes.body}>
                {props.children}
            </div>
        </div>
    )
}