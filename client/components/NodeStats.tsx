
import React from 'react';
import { createUseStyles } from 'react-jss';
import { Badge, Col, Row, Typography } from 'antd';
import { Stats } from '../../server/entities/Stats';

const { Text } = Typography;

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
    stats: Stats | undefined;
}

export const NodeStats = (props: Props) => {
    const classes = useStyles();

    if (!props.stats) {
        return (
            (<></>)
        )
    }

    return (
        <Row>
            <Col span={24} style={{ marginBottom: '15px' }}><Text strong>Explorer details</Text></Col>
            <Col span={24}>
                <Row justify="space-between">
                    <Col><Text style={{ fontSize: '14px' }}>file count:</Text></Col>
                    <Col><Badge style={{ backgroundColor: '#63a1b8' }} count={props.stats.files.count} /></Col>
                </Row>
            </Col>
            <Col span={24}>
                <Row justify="space-between">
                    <Col><Text style={{ fontSize: '14px' }}>total file size:</Text></Col>
                    <Col><Badge style={{ backgroundColor: '#1fa4d1' }} count={props.stats.files.totalSize} /></Col>
                </Row>
            </Col>
            <Col span={24}>
                <Row justify="space-between">
                    <Col><Text style={{ fontSize: '14px' }}>average file size:</Text></Col>
                    <Col><Badge style={{ backgroundColor: '#5b7c87' }} count={props.stats.files.avgSize} /></Col>
                </Row>
            </Col>
            <Col style={{ paddingBottom: '15px', paddingTop: '15px' }}><Text strong>Codecs</Text></Col>

            {props.stats.files.codecs.map((codec) => {
                return (
                    <Col key={codec.name} span={24}>
                        <Row justify="space-between">
                            <Col><Text style={{ fontSize: '14px' }}>{codec.name}</Text></Col>
                            <Col>
                                <Badge style={{ backgroundColor: '#95b4bf' }} count={codec.count} /> | <Badge style={{ backgroundColor: '#205263' }} count={codec.size} />
                            </Col>
                        </Row>
                    </Col>
                )
            })}
        </Row>
    )
}