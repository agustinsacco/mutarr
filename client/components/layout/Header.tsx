
import { Grid, Image, Link, Loading, Text } from '@nextui-org/react';
import React from 'react';
import { createUseStyles } from 'react-jss';

const useStyles = createUseStyles({
    root: {
        backgroundColor: 'white'
    }
});

export const Header = () => {
    const classes = useStyles();
    return (
        <header className={classes.root}>
            <Grid.Container gap={0} justify="center" alignItems="center">
                {/* <Grid xs={6}>
                    <Image src="/logo.png" />
                </Grid>
                <Grid xs={6}>
                    <Grid.Container gap={0} justify="flex-end" alignItems="center">
                        <Grid xs={6}>
                            <Text size={25} transform="uppercase">Home</Text>
                        </Grid>
                    </Grid.Container>
                </Grid> */}

            </Grid.Container>
        </header>
    )
}