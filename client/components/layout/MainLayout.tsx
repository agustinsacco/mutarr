
import React, { useState } from 'react';
import { createUseStyles } from 'react-jss';
import { Col, Layout, Menu, Row } from 'antd';
import { HomeOutlined, PieChartOutlined, SettingOutlined } from '@ant-design/icons';

const { Header, Content, Footer, Sider } = Layout;

const useStyles = createUseStyles({
    content: {
        margin: '50px 50px'
    }
});

type Props = {
    children?: JSX.Element | JSX.Element[];
}

export const MainLayout = (props: Props) => {
    const classes = useStyles();
    return (
        <Layout style={{height:"100vh"}}>
            <Header>
                <Menu theme="dark" mode="horizontal" defaultSelectedKeys={['1']} items={[
                    { key: '1', label: 'Home', icon: <HomeOutlined /> },
                    { key: '2', label: 'Stats', icon: <PieChartOutlined /> },
                    { key: '3', label: 'Settings', icon: <SettingOutlined /> },
                ]} />
            </Header>
            <Content className={classes.content}>
                {props.children}
            </Content>
            <Footer style={{ textAlign: 'center' }}>Mutarr ©2023 Created by Agustin Sacco</Footer>

        </Layout>
    )
}