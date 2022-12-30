
import classNames from 'classnames';
import React from 'react';
import { createUseStyles } from 'react-jss';
import { FSNode, FSNodeType } from '../../server/entities/FSNode';
import { AiOutlineDown } from 'react-icons/ai';
import { Loading } from '@nextui-org/react';

const useStyles = createUseStyles({
    root: {

    },
    nodeGroup: {
        marginLeft: 25,
    },
    fileLabel: {
        '&:hover': {
            color: '#7a8385',
        },
        cursor: 'pointer'
    },
    dirContainer: {
    },
    explorerContainer: {
        marginLeft: -20,
        font: {
            size: 14
        }
    },
    dirLabel: {
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
    selected: {
        fontWeight: 'bold'
    },
});

type Props = {
    nodes: FSNode[] | undefined;
    nodeStates: { [key: string]: boolean };
    currentNode: FSNode | undefined;
    onClick: Function;
    onExpand: Function;
    loading: boolean;
}

export const NodeTree = (props: Props) => {
    const classes = useStyles();

    const displayNodes = (nodes: FSNode[]) => {
        return nodes.map((node: FSNode) => {

            if (node.type == FSNodeType.DIR) {
                return (
                    <div key={node.name} className={classes.nodeGroup}>
                        <div className={classes.dirWrap} onClick={() => props.onExpand(node.path)}>
                            <span className={classes.dirLabel}>{node.name}</span>
                            <AiOutlineDown className={classes.dirIcon} onClick={() => props.onExpand(node.path)} />
                        </div>
                        {node?.children && node.children.length > 0 && // Has children
                            (props.nodeStates[node.path] === true) &&
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
                            { [classes.selected]: props.currentNode?.path === node.path }
                        )}
                        onClick={() => props.onClick(node)}>
                        <div className={classes.fileLabel}>{node.name}</div>
                    </div>
                )
            }
        })
    }

    return (
        <div className={classes.root}>
            {props.loading ?
                <Loading />
                :
                <React.Fragment>{props.nodes && displayNodes(props.nodes)}</React.Fragment>
            }
        </div>
    )
}