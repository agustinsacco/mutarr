import type { NextPage } from 'next'
import React from 'react'
import { Container, Card, Grid, Button, Text, Spacer } from "@nextui-org/react";
import io from 'socket.io-client';
import { useEffect, useState } from 'react';
import request from 'superagent';
import { createUseStyles } from 'react-jss'; ``
import { FSNode, FSNodeType } from '../server/entities/FSNode';
import { AiOutlineDown } from 'react-icons/ai';
import classNames from 'classnames';

const socket = io('http://0.0.0.0:3001');

const useStyles = createUseStyles({
	nodeGroup: {
		// border: '1px solid black',
		marginLeft: 25,
	},
	fileLabel: {
		// border: '1px solid red'
		'&:hover': {
			color: '#7a8385',
		},
		cursor: 'pointer'
	},
	dirContainer: {
		// border: '1px solid yellow'
	},
	explorerContainer: {
		marginLeft: -20,
		font: {
			size: 14
		}
		// border: '1px solid blue'
	},
	card: {
		border: '1px solid #D6D6D6',
		borderRadius: 3,
		padding: 10
	},
	dirLabel: {
		// border: '1px solid purple'
	},
	dirWrap: {
		cursor: 'pointer'
	},
	dirIcon: {
		margin: {
			left: 5
		},
		paddingTop: 3,
		fontSize: 14,
	},
	root: {
		maxWidth: 1200,
		width: '100%',
		margin: '0 auto'
	},
	selected: {
		fontWeight: 'bold'
	}
});

const Home: NextPage = () => {
	const classes = useStyles();
	const [isConnected, setIsConnected] = useState(false);
	const [nodes, setNodes] = useState();
	const [jobs, setJobs] = useState();
	const [currentNode, setCurrentNode] = useState<FSNode>();
	const [lastPong, setLastPong] = useState('');
	const [nodeStates, setNodeStates] = useState<{ [key: string]: boolean }>({});

	useEffect(() => {
		onMount();
		return () => {
			unMount();
		};
	}, []);

	const onMount = async (): Promise<void> => {
		socket.on('connect', () => {
			setIsConnected(true);
		});
		socket.on('disconnect', () => {
			setIsConnected(false);
		});
		socket.on('pong', () => {
			setLastPong(new Date().toISOString());
		});
		socket.on('job', (job) => {
			console.log(job);
		});
		// Get nodes
		getNodes();
		// Get jobs
		getJobs();
	}

	const getJobs = async () => {
		const jobs = (await request.get('/jobs'))?.body;
		if (jobs) {
			setJobs(jobs);
		}
	}

	const getNodes = async () => {
		const nodes = (await request.get('/nodes'))?.body;
		if (nodes) {
			setNodes(nodes);
		}
	}

	const unMount = (): void => {
		socket.off('connect');
		socket.off('disconnect');
		socket.off('pong');
	}


	const sendPing = () => {
		socket.emit('ping');
	}

	const displayExplorer = () => {
		if (nodes) {
			const nodeEls = displayNodes(nodes);
			return (
				<div className={classes.explorerContainer}>
					{nodeEls}
				</div>
			)
		}
	}

	const triggerNodeGroup = (path: string) => {
		console.log('path', path);
		setNodeStates({
			...nodeStates,
			[path]: nodeStates[path] !== undefined ? !nodeStates[path] : true
		})
	}

	const enqueueJob = async (node: FSNode) => {
		await request.post('/jobs').send(node);
	}

	const displayNodes = (nodes: FSNode[]) => {
		return nodes.map((node: FSNode) => {

			if (node.type == FSNodeType.DIR) {
				return (
					<div key={node.name} className={classes.nodeGroup}>
						<div className={classes.dirWrap} onClick={() => triggerNodeGroup(node.path)}>
							<span className={classes.dirLabel}>{node.name}</span>
							<AiOutlineDown className={classes.dirIcon} onClick={() => triggerNodeGroup(node.path)} />
						</div>
						{node?.children && node.children.length > 0 && // Has children
							(nodeStates[node.path] === true) &&
							<div className={classes.dirContainer}>
								{displayNodes(node.children)}
							</div>
						}
					</div>
				)
			}
			if (node.type == FSNodeType.FILE) {
				return (
					<div
						key={node.name}
						className={classNames(
							classes.nodeGroup,
							{ [classes.selected]: currentNode?.path === node.path }
						)}
						onClick={() => setCurrentNode(node)}>
						<div className={classes.fileLabel}>{node.name}</div>
					</div>
				)
			}
		})
	}

	const displayCurrentNode = () => {
		if (!currentNode) {
			return
		}
		return (
			<Card className={classes.card}>
				<Grid.Container>
					<Grid xs={12} css={{ marginBottom: 15 }}>
						<Grid.Container direction="row">
							<Text weight="bold" size={18}>{currentNode.name}</Text>
							<Text size={12}>{currentNode.path}</Text>
						</Grid.Container>
					</Grid>
					<Grid xs={12}>
						<Text>Streams</Text>
					</Grid>
					{currentNode?.streams && currentNode.streams.map((stream: any, index: number) => {
						if (stream.codec_name !== 'subrip') {
							return (
								<Grid key={index} xs={6}>
									<Grid.Container direction="row">
										<Text size={12}>{stream.codec_long_name}</Text>
										<Text size={12}>Display aspect ratio: {stream.display_aspect_ratio}</Text>
										{stream.display_aspect_ratio && <Text size={12}>Display aspect ratio: {stream.display_aspect_ratio}</Text>}
									</Grid.Container>
								</Grid>
							)
						}
					})}
					<Grid xs={12} css={{ marginTop: 15 }}>
						<Button onClick={() => enqueueJob(currentNode)} color="default" size="xs">Convert</Button>
					</Grid>

				</Grid.Container>
			</Card>
		)
	}

	return (
		<div className={classes.root}>
			<Grid.Container gap={2} justify="center" css={{ padding: 20 }}>
				<Grid xs={6}>
					<Card className={classes.card}>
						<Button onClick={sendPing}>Ping Server</Button>
					</Card>

				</Grid>
				<Grid xs={6}>
					<Card className={classes.card}>
						<div>is connected: {isConnected ? 'true' : 'false'}</div>
						<div>last pong: {lastPong}</div>
					</Card>

				</Grid>
				<Grid xs={8}>
					<Grid.Container direction="row" alignContent="flex-start">
						{currentNode &&
							<Grid xs={12} css={{ marginBottom: 20 }}>
								{displayCurrentNode()}
							</Grid>
						}
						<Grid xs={12}>
							<Card className={classes.card}>
								<Text>File Explorer</Text>
								{displayExplorer()}
							</Card>
						</Grid>
					</Grid.Container>

				</Grid>
				<Grid xs={4}>
					<Grid.Container direction="row" alignContent="flex-start">
						<Grid xs={12} css={{ marginBottom: 20 }}>
							<Card className={classes.card}>
								<Text>Active Jobs</Text>

							</Card>
						</Grid>
						<Grid xs={12}>
							<Card className={classes.card}>
								<Text>Queued Jobs</Text>

							</Card>
						</Grid>
					</Grid.Container>

				</Grid>

			</Grid.Container>
		</div>

	)
}

export default Home
