
import { Modal, useModal, Button, Text } from "@nextui-org/react";
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
    onClose: any;
}

export const SettingsModal = (props: Props) => {
    const classes = useStyles();
  
    return (
        <Modal
            scroll
            fullScreen
            closeButton
            aria-labelledby="modal-title"
            aria-describedby="modal-description"
            open={props.open}
            onClose={props.onClose}>
            <Modal.Header>
                <Text id="modal-title" size={18}>
                    {props.title}
                </Text>
            </Modal.Header>
            <Modal.Body>
                <Text id="modal-description">
                    
                </Text>
            </Modal.Body>
            <Modal.Footer>
                <Button flat auto color="error" onClick={() => props.onClose()}>
                    Close
                </Button>
                <Button onClick={() => props.onClose()}>Agree</Button>
            </Modal.Footer>
        </Modal>
    )
}