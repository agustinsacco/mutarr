import type { NextPage } from 'next'
import { Button } from "@nextui-org/react";
import io from 'socket.io-client';
import { useEffect, useState } from 'react';
import request from 'superagent';
import { createUseStyles } from 'react-jss';
import { FSNode, FSNodeType } from '../server/entities/FSNode';

const socket = io('http://0.0.0.0:3001');

const useStyles = createUseStyles({
	nodeGroup: {
		border: '1px solid black'
	},
	fileLabel: {
		border: '1px solid red'
	},
	dirLabel: {
		border: '1px solid purple'
	},
	dirContainer: {
		border: '1px solid yellow'
	},
	explorerContainer: {
		border: '1px solid blue'
	}
});

const Home: NextPage = () => {
	const classes = useStyles();
	const [isConnected, setIsConnected] = useState(socket.connected);
	const [nodes, setNodes] = useState();
	const [lastPong, setLastPong] = useState('');

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
		// Get nodes
		// const nodes = (await request.get('/fs/nodes'))?.body;
		// if (nodes) {
		// 	setNodes(nodes);
		// }
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
			return (
				<div className={classes.explorerContainer}>
					{displayNodes(nodes)}
				</div>
			)
		}
	}

	const displayNodes = (nodes: FSNode[]) => {
		return nodes.map((node: FSNode) => {
			if (node.type == FSNodeType.DIR) {
				return (
					<div className={classes.nodeGroup}>
						<div className={classes.dirLabel}>{node.name}</div>
						{node?.children && node.children.length > 0 &&
							<div className={classes.dirContainer}>
								{displayNodes(node.children)}
							</div>
						}
					</div>
				)

			}
			if (node.type == FSNodeType.FILE) {
				return (
					<div className={classes.nodeGroup}>
						<div className={classes.fileLabel}>{node.name}</div>
					</div>
				)
			}
		})
	}

	return (
		<div>
			<Button onClick={sendPing}>Ping Server</Button>
			<div>is connected: {isConnected ? 'true' : 'false'}</div>
			<div>last pong: {lastPong}</div>
			<div>{nodes ? JSON.stringify(nodes, null, 2) : 'Loading...'}</div>
			{displayExplorer()}
		</div>
	)
}

export default Home
