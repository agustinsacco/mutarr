
import { Modal, Button } from "antd";
import React, { ReactEventHandler } from 'react';
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
    open: boolean;
    onCancel: any;
    onOk: any;
    title: string;
}

export const SettingsModal = (props: Props) => {
    const classes = useStyles();

    return (
        <Modal
            title={props.title}
            open={props.open}
            onOk={props.onOk}
            onCancel={props.onCancel}>
            SEttings modal
        </Modal>
    )
}