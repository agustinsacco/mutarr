import type { NextPage } from 'next'
import React from 'react'
import { Card, Grid, Button, Text } from "@nextui-org/react";
import io from 'socket.io-client';
import { useEffect, useState } from 'react';
import request from 'superagent';
import { createUseStyles } from 'react-jss'; ``
import { FSNode } from '../server/entities/FSNode';
import { RxCrossCircled } from 'react-icons/rx';
import Queue from 'bull';
import { readableBytes } from '../server/utilities/Bytes';
import { Box } from '../client/components/Box';
import { NodeTree } from '../client/components/NodeTree';
import { ActiveNode } from '../client/components/ActiveNode';
import { AiOutlinePlayCircle, AiOutlinePauseCircle } from 'react-icons/ai'
import { MdDeleteSweep } from 'react-icons/md'

const socket = io('http://0.0.0.0:3001');

const useStyles = createUseStyles({
	root: {
		// maxWidth: 1200,
		// width: '100%',
		// margin: '0 auto'
	},
	card: {
		border: '1px solid #D6D6D6',
		borderRadius: 3,
		padding: 10
	},
	closeIcon: {
		cursor: 'pointer',
		fontSize: 20
	},
	jobIcon: {
		fontSize: 28,
		cursor: 'pointer'
	}
});

const Home: NextPage = () => {
	const classes = useStyles();
	const [isConnected, setIsConnected] = useState(false);
	const [isPaused, setIsPaused] = useState(false);
	const [nodes, setNodes] = useState();
	const [nodesLoading, setNodesLoading] = useState(false);
	const [jobs, setJobs] = useState<any>({
		active: [],
		delayed: [],
		completed: [],
		failed: [],
		waiting: [],
	});
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
		socket.on('jobsRefresh', (jobsUpdate) => {
			console.log('jobsRefresh');
			setJobs(jobsUpdate);
		});
		socket.on('nodesRefresh', (nodesUpdate) => {
			console.log('nodesRefresh');
			setNodes(nodesUpdate);
		});
		// Get nodes
		getNodes();
		// Get jobs
		getJobs();
		// Get statusd
		getStatus();
	}

	const getJobs = async () => {
		const jobsRsp = (await request.get('/queue/jobs'))?.body;
		if (jobsRsp) {
			setJobs(jobsRsp);
		}
	}

	const getNodes = async () => {
		const nodes = (await request.get('/nodes'))?.body;
		if (nodes) {
			setNodes(nodes);
		}
	}

	const handleNodeClick = async (node: FSNode) => {
		const fileNode = (await request.post('/nodes/streams').send({ path: node.path }))?.body;
		if (fileNode) {
			setCurrentNode(fileNode);
		} else {
			setCurrentNode(node);
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
	const handleNodeExpand = (path: string) => {
		setNodeStates({
			...nodeStates,
			[path]: nodeStates[path] !== undefined ? !nodeStates[path] : true
		})
	}
	const addJob = async (node: FSNode) => {
		const jobs = await request.post('/queue/jobs').send(node);
		// setJobs(jobs)
	}
	const removeJob = async (id: string) => {
		await request.delete(`/queue/jobs/${id}`);
	}
	const pauseQueue = async () => {
		await request.post('/queue/pause');
		setIsPaused(true);
	}
	const getStatus = async () => {
		const statusRsp = (await request.get('/queue/status')).body;
		setIsPaused(statusRsp.isPaused);
	}
	const resumeQueue = async () => {
		await request.post('/queue/resume');
		setIsPaused(false);
	}

	const displayJobs = (status: 'active' | 'delayed' | 'completed' | 'failed' | 'waiting') => {
		if (jobs && jobs[status] && jobs[status].length > 0) {
			return (
				<Grid.Container>
					{jobs[status].map((job: Queue.Job) => {
						return (
							<Grid key={job.id} xs={12} css={{ marginBottom: 10 }}>
								<Box>
									<Grid.Container direction="column">
										<Grid.Container direction="row" justify="space-between">
											<Text size={16}># {job.id}</Text>
											<RxCrossCircled className={classes.closeIcon} onClick={() => removeJob(job.id.toString())} />
										</Grid.Container>
										<Grid.Container direction="column" css={{ marginTop: 5 }}>
											<Text weight="bold" size={12}>{job.data?.path}</Text>
											{job?.data?.progress &&
												<Grid.Container direction="row" css={{ marginTop: 10 }}>
													<Grid xs={6}>
														<Grid.Container direction="column" alignContent="center">
															<Text size={12}>fps: {readableBytes(job.data.progress.fps)}</Text>
															<Text size={12}>bitrate: {job.data.progress.bitrate}</Text>
															<Text size={12}>out time: {job.data.progress.out_time}</Text>
														</Grid.Container>
													</Grid>
													<Grid xs={6}>
														<Grid.Container direction="column" alignContent="center">
															<Text size={12}>size: {readableBytes(job.data.progress.total_size)}</Text>
															<Text size={12}>speed: {job.data.progress.speed}</Text>
															<Text size={12}>drop frame: {job.data.progress.drop_frames}</Text>
														</Grid.Container>
													</Grid>
												</Grid.Container>
											}
										</Grid.Container>
										<Grid.Container direction="row">

										</Grid.Container>
									</Grid.Container>
								</Box>
							</Grid>
						)
					})}
				</Grid.Container>
			)
		}
	}

	return (
		<div className={classes.root}>
			<Grid.Container gap={1} justify="center">
				<Grid xs={4}>
					<Grid.Container direction="row" alignContent="flex-start">
						<Grid xs={12} css={{ marginBottom: 20 }}>
							<Card className={classes.card}>

								<Grid.Container gap={1} direction="row" justify="flex-end" alignItems="center">
									<Grid><AiOutlinePlayCircle className={classes.jobIcon} onClick={() => resumeQueue()} /></Grid>
									<Grid><AiOutlinePauseCircle className={classes.jobIcon} onClick={() => pauseQueue()} /></Grid>
									<Grid><MdDeleteSweep className={classes.jobIcon} onClick={() => resumeQueue()} /></Grid>
								</Grid.Container>
							</Card>
						</Grid>
						<Grid xs={12} css={{ marginBottom: 10 }}>
							<Card className={classes.card}>
								<Text>Active Jobs</Text>
								{displayJobs('active')}
							</Card>
						</Grid>
						<Grid xs={12} css={{ marginBottom: 10 }}>
							<Card className={classes.card}>
								<Text>Waiting Jobs</Text>
								{displayJobs('waiting')}
							</Card>
						</Grid>
						<Grid xs={12} css={{ marginBottom: 10 }}>
							<Card className={classes.card}>
								<Text>Failed Jobs</Text>
								{displayJobs('failed')}
							</Card>
						</Grid>
						<Grid xs={12}>
							<Card className={classes.card}>
								<Text>Complete Jobs</Text>
								{displayJobs('completed')}
							</Card>
						</Grid>
					</Grid.Container>

				</Grid>

				<Grid xs={8}>
					<Grid.Container direction="row" alignContent="flex-start">
						{currentNode &&
							<Grid xs={12} css={{ marginBottom: 20 }}>
								<ActiveNode
									onConvert={addJob}
									node={currentNode}
									jobs={jobs?.active} />
							</Grid>
						}
						<Grid xs={12}>
							<Card className={classes.card}>
								<Text>File Explorer</Text>
								<NodeTree
									nodes={nodes}
									nodeStates={nodeStates}
									currentNode={currentNode}
									onClick={handleNodeClick}
									onExpand={handleNodeExpand}
									loading={nodesLoading}
								/>
							</Card>
						</Grid>
					</Grid.Container>

				</Grid>

			</Grid.Container>
		</div>

	)
}

export default Home
