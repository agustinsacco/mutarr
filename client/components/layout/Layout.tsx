
import { Grid } from '@nextui-org/react';
import React from 'react';
import { createUseStyles } from 'react-jss';
import { VscSettingsGear } from 'react-icons/vsc';
import { IoStatsChartOutline } from 'react-icons/io5';
import classNames from 'classnames';

const useStyles = createUseStyles({
    root: {
        height: 'auto',
        maxWidth: 1200,
        margin: '30px auto'
    },
    logo: {
        fontFamily: 'Roboto',
        fontSize: 50,
    },
    menu: {
    },
    body: {
        margin: {
            top: 20,
            // right: 50,
            // left: 50
        }
    },
    icon: {
        fontSize: 28,
        cursor: 'pointer',
        marginLeft: 15,
        '&:hover': {
            color: '#7a8385',
        },
    }
});

type Props = {
    children?: JSX.Element | JSX.Element[];
}

export const Layout = (props: Props) => {
    const classes = useStyles();
    return (
        <div className={classes.root}>
            <Grid.Container direction="row" justify="space-between" alignItems="center">
                <div className={classes.logo}>
                    MUTARR
                </div>
                <div className={classes.menu}>
                    <IoStatsChartOutline className={classNames(classes.icon)} />
                    <VscSettingsGear className={classNames(classes.icon)} />
                </div>
            </Grid.Container>
            <div className={classes.body}>
                {props.children}
            </div>
        </div>
    )
}