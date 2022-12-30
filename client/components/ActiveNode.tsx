
import React from 'react';
import { createUseStyles } from 'react-jss';
import { FSNode } from '../../server/entities/FSNode';
import { Badge, Button, Card, Grid, Text } from '@nextui-org/react';
import { Job } from 'bull';
import { readableBytes } from '../../server/utilities/Bytes';

const useStyles = createUseStyles({
    card: {
        border: '1px solid #D6D6D6',
        borderRadius: 3,
        padding: 10
    },

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
    return (
        <Card className={classes.card}>
            <Grid.Container>
                <Grid xs={12} css={{ marginBottom: 15 }}>
                    <Grid.Container direction="column">
                        <Text weight="bold" size={18}>{props?.node?.name}</Text>
                        <Text size={12}>{props?.node?.path}</Text>
                        <Grid.Container direction="row">
                            <Badge size="sm" color="primary">{props?.node?.size && readableBytes(props?.node?.size)}</Badge>
                            <Badge size="sm" color="secondary">{props?.node?.format && props?.node?.format}</Badge>
                            <Badge size="sm" color="warning">{getVideoStream().codec_name}</Badge>
                        </Grid.Container>
                    </Grid.Container>
                </Grid>
                <Grid xs={12}>
                    <Text>Streams</Text>
                </Grid>
                {props.node?.streams && props.node.streams.map((stream: any, index: number) => {
                    if (stream.codec_name !== 'subrip') {
                        return (
                            <Grid key={index} xs={6}>
                                <Grid.Container direction="column">
                                    <Text size={12}>{stream.codec_long_name}</Text>
                                    <Text size={12}>Type: {stream.codec_type}</Text>
                                    {stream.display_aspect_ratio && <Text size={12}>Aspect ratio: {stream.display_aspect_ratio}</Text>}
                                </Grid.Container>
                            </Grid>
                        )
                    }
                })}
                <Grid xs={12} css={{ marginTop: 15 }}>
                    <Button
                        disabled={props.jobs.find((j: Job) => j.data.path === props?.node?.path) !== undefined}
                        onClick={() => props.onConvert(props.node)} color="secondary" size="xs">Convert</Button>
                </Grid>

            </Grid.Container>
        </Card>
    )
}