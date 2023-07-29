import React, { useState } from 'react';
import { createUseStyles } from 'react-jss';
import { Layout, Menu, Row } from 'antd';
import { SettingOutlined } from '@ant-design/icons';
import { Button, ConfigProvider } from 'antd';
import { Logo } from '../Logo';

const { Header, Content, Footer, Sider } = Layout;

const useStyles = createUseStyles({
  content: {
    margin: '30px 30px',
  },
  bg: {
    backgroundColor: '#f9f9f9',
    backgroundSize: '20px 20px',
    backgroundImage: 'radial-gradient(circle, #c4c8c8 1px, rgba(0, 0, 0, 0) 1px)'
  },
});

type Props = {
  children?: JSX.Element | JSX.Element[];
};

export const MainLayout = (props: Props) => {
  const classes = useStyles();
  return (
    <ConfigProvider
      theme={{
        token: {
          fontFamily: 'Source Code Pro'
        }
      }}
    >
      <Layout className={classes.bg}>
        <Header style={{backgroundColor: 'transparent', marginBottom: 15}}>
          <Logo />
        </Header>
        <Content className={classes.content}>{props.children}</Content>
        <Footer style={{ textAlign: 'center' }}>
          Mutarr {new Date().getFullYear()} Created by Agustin Sacco
        </Footer>
      </Layout>
    </ConfigProvider>
  );
};
