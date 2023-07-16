
import React from 'react';
import { createUseStyles } from 'react-jss';
import { FSNode, FSNodeType } from '../../server/entities/FSNode';
import { Job } from 'bull';
import { bytesToReadable } from '../../server/utilities/Bytes';
import { Col, Row, Badge, Button, Typography } from 'antd';
import { FileOutlined, FolderOutlined, VideoCameraOutlined } from '@ant-design/icons';

const { Text, Link } = Typography;

const useStyles = createUseStyles({
    card: {
        borderRadius: 3,
        padding: 10
    },
    streams: {
        padding: 5,
        margin: 5
    }
});

type Props = {
    node: FSNode | undefined;
    jobs: Job[];
    onConvert: Function;
}

export const ActiveNode = (props: Props) => {
    const classes = useStyles();

    if (!props.node) {
        return (
            (<></>)
        )
    }

    const getVideoStream = () => {
        if (!props?.node?.streams) {
            return;
        }
        return props?.node?.streams.find((stream: any) => {
            return stream.codec_type === 'video';
        });
    }

    const getNodeIcon = () => {
        if (props.node.type == FSNodeType[FSNodeType.FILE]) {
            if (props.node?.streams) { // Its a video
                return <VideoCameraOutlined style={{ marginRight: 5 }} />;
            }
            return <FileOutlined style={{ marginRight: 5 }} />
        } else {
            return <FolderOutlined style={{ marginRight: 5 }} />
        }
    }

    return (
        <Row>
            <Col span={24}>
                <Row>
                    <Text strong>{getNodeIcon()}{props?.node?.name}</Text>
                </Row>
                <Row><Text italic style={{ fontSize: 12 }}>{props?.node?.path}</Text></Row>
                {props.node.type === FSNodeType[FSNodeType.FILE] &&
                    <Row gutter={5} style={{ marginTop: 5 }}>
                        <Col><Badge color="#59a672" count={props?.node?.size && props?.node?.size} /></Col>
                        <Col><Badge color="secondary" count={props?.node?.format && props?.node?.format} /></Col>
                        {getVideoStream() &&
                            <Col><Badge color="warning" count={getVideoStream().codec_name} /></Col>
                        }
                    </Row>
                }

            </Col >
            {props.node.type == FSNodeType[FSNodeType.FILE] && props.node?.streams &&
                <>
                    <Col span={24} style={{ marginTop: 10 }}>
                        <Text strong>Streams</Text>
                    </Col>
                    {props.node.type == FSNodeType[FSNodeType.FILE] && props.node?.streams && props.node.streams.map((stream: any, index: number) => {
                        if (stream.type !== 'data') {
                            return (
                                <Col key={index} span={12} style={{ padding: 3 }}>
                                    <Row><Text style={{ fontSize: 11 }}>codec: {stream.codec_long_name}</Text></Row>
                                    <Row><Text style={{ fontSize: 11 }}>type: {stream.codec_type}</Text></Row>
                                    <Row><Text style={{ fontSize: 11 }}>aspect ratio: {stream.display_aspect_ratio}</Text></Row>
                                </Col>
                            )
                        }
                    })}
                </>
            }
            {props.node.type === FSNodeType[FSNodeType.FILE] && getVideoStream() &&
                <Col span={24} style={{ marginTop: 10 }}>
                    <Button
                        size="small"
                        loading={props.jobs.find((j: Job) => j.data.path === props?.node?.path) !== undefined}
                        disabled={props.jobs.find((j: Job) => j.data.path === props?.node?.path) !== undefined}
                        onClick={() => props.onConvert(props.node)}>Queue for conversion</Button>
                </Col>
            }
        </Row>
    )
}