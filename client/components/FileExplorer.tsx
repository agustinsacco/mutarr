import { Button, Card, Space, Tree } from 'antd';
import { CarryOutOutlined, CheckOutlined, FormOutlined } from '@ant-design/icons';
import { DataNode } from 'antd/es/tree';
import classNames from 'classnames';
import React, { useState } from 'react';
import { createUseStyles } from 'react-jss';
import { FSNode, FSNodeType } from '../../server/entities/FSNode';
import { Key } from 'antd/es/table/interface';

const { DirectoryTree } = Tree;

const useStyles = createUseStyles({
  root: {},
  nodeGroup: {
    marginLeft: 25,
  },
  fileLabel: {
    '&:hover': {
      color: '#7a8385',
    },
    cursor: 'pointer',
  },
  dirContainer: {},
  explorerContainer: {
    marginLeft: -20,
    font: {
      size: 14,
    },
  },
  dirLabel: {},
  dirWrap: {
    cursor: 'pointer',
  },
  dirIcon: {
    margin: {
      left: 5,
    },
    paddingTop: 3,
    fontSize: 14,
  },
  selected: {
    fontWeight: 'bold',
  },
});

type Props = {
  nodes: FSNode[] | undefined;
  node: FSNode | undefined;
  onClick: Function;
  onCheck: Function;
  checkedKeys: Key[];
  onCheckedSubmit: Function;
  onCheckedLoading: boolean;
  onCheckedClear: Function;
};

export const FileExplorer = (props: Props) => {
  const classes = useStyles();

  const getTreeData = (nodes: FSNode[]): DataNode[] => {
    return nodes.map((fsNode: FSNode) => {
      let treeNode: any = {
        title: fsNode.name,
        key: fsNode.path,
        isLeaf: true,
      };
      if (fsNode.children) {
        treeNode = {
          ...treeNode,
          isLeaf: false,
          children: getTreeData(fsNode.children),
        };
      }
      return treeNode;
    });
  };

  const handleSelect = (dataNode: Key[]) => {
    props.onClick(dataNode);
  };

  const handleCheck = (
    checked: { checked: Key[]; halfChecked: Key[] } | Key[],
    info: any
  ) => {
    const nodes: FSNode[] = [];
    for (const node of info.checkedNodes) {
      const path: any = node.key;
      // Only add leaf nodes
      if (node.isLeaf == true) {
        nodes.push({
          path: path,
          type: FSNodeType.FILE,
        });
      }
    }
    props.onCheck(nodes);
  };

  return (
    <div className={classes.root}>
      {props.nodes && (
        <>
          {props.checkedKeys && props.checkedKeys.length > 0 && (
            <Space wrap style={{ marginBottom: 15 }}>
              <Button
                onClick={() => props.onCheckedSubmit()}
                type="primary"
                size="small"
                loading={props.onCheckedLoading}
              >
                Transcode all
              </Button>
              <Button
                onClick={() => props.onCheckedClear()}
                size="small"
                loading={props.onCheckedLoading}
              >
                Clear selected
              </Button>
            </Space>
          )}
          <DirectoryTree
            checkable
            showLine={true}
            checkedKeys={props.checkedKeys}
            onSelect={handleSelect}
            onCheck={handleCheck}
            treeData={getTreeData(props.nodes)}
          />
        </>
      )}
    </div>
  );
};
