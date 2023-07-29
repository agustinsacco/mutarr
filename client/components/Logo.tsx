import classNames from 'classnames';
import Image from 'next/image';
import React from 'react';
import { createUseStyles } from 'react-jss';

const useStyles = createUseStyles({
  root: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    verticalAlign: 'center',
    margin: 10,
  },
  title: {
    // textTransform: 'uppercase',
    fontFamily: 'Tektur',
    fontSize: 70,
    paddingLeft: 10
  },
});

export const Logo = () => {
  const classes = useStyles();
  return (
    <div className={classes.root}>
      <Image width={70} height={70} src="/logo.png" />
      <div className={classes.title}>mutarr</div>
    </div>
  );
};
