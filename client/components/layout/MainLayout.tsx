import React, { useState } from 'react';
import { createUseStyles } from 'react-jss';
import { Layout, Menu, Row } from 'antd';
import { SettingOutlined } from '@ant-design/icons';

const { Header, Content, Footer, Sider } = Layout;

const useStyles = createUseStyles({
  content: {
    margin: '50px 50px',
  },
});

type Props = {
  children?: JSX.Element | JSX.Element[];
};

export const MainLayout = (props: Props) => {
  const classes = useStyles();
  return (
    <Layout>
      <Header>
        <Menu
          theme="dark"
          mode="horizontal"
          title="MUTARR"
          defaultSelectedKeys={['1']}
          items={[{ key: '3', label: 'Settings', icon: <SettingOutlined /> }]}
        />
      </Header>
      <Content className={classes.content}>{props.children}</Content>
      <Footer style={{ textAlign: 'center' }}>
        Mutarr {new Date().getFullYear()} Created by Agustin Sacco
      </Footer>
    </Layout>
  );
};
