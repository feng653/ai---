import { ChevronRight, Search, X } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import type { Card } from "../../domain/card";
import {
  buildKnowledgeTree, searchKnowledgeTree, selectionPath,
  type KnowledgeSelection, type KnowledgeTreeNode,
} from "./knowledgeTree";

type Props = {
  cards: Card[];
  selection: KnowledgeSelection | null;
  onChange: (selection: KnowledgeSelection | null) => void;
};

type BranchProps = {
  node: KnowledgeTreeNode;
  selectedKey?: string;
  expanded: Set<string>;
  searching: boolean;
  onToggle: (key: string) => void;
  onSelect: (selection: KnowledgeSelection) => void;
};

function TreeBranch({ node, selectedKey, expanded, searching, onToggle, onSelect }: BranchProps) {
  const hasChildren = node.children.length > 0;
  const open = searching || expanded.has(node.key);
  return <li className={`knowledge-tree-node level-${node.level}`}>
    <div className={`knowledge-tree-row${selectedKey === node.key ? " selected" : ""}`}>
      {hasChildren ? <button className="knowledge-tree-toggle" type="button"
        aria-label={`${open ? "收起" : "展开"}${node.label}`} onClick={() => onToggle(node.key)}>
        <ChevronRight className={open ? "open" : ""} size={14} />
      </button> : <span className="knowledge-tree-spacer" />}
      <button className="knowledge-tree-label" type="button" onClick={() => onSelect(node.selection)}>
        <i /><span>{node.label}</span><small>{node.count}</small>
      </button>
    </div>
    {hasChildren && open ? <ul>{node.children.map((child) => <TreeBranch key={child.key}
      node={child} selectedKey={selectedKey} expanded={expanded} searching={searching}
      onToggle={onToggle} onSelect={onSelect} />)}</ul> : null}
  </li>;
}

export function KnowledgeTreeFilter({ cards, selection, onChange }: Props) {
  const [query, setQuery] = useState("");
  const tree = useMemo(() => buildKnowledgeTree(cards), [cards]);
  const visible = useMemo(() => searchKnowledgeTree(tree, query), [query, tree]);
  const [expanded, setExpanded] = useState<Set<string>>(new Set());

  useEffect(() => {
    setExpanded((current) => new Set([...current, ...tree.map((node) => node.key)]));
  }, [tree]);

  const toggle = (key: string) => setExpanded((current) => {
    const next = new Set(current);
    next.has(key) ? next.delete(key) : next.add(key);
    return next;
  });
  const select = (next: KnowledgeSelection) => onChange(selection?.key === next.key ? null : next);

  return <aside className="knowledge-tree-panel" aria-label="知识点分类">
    <header><div><h2>知识点目录</h2><p>点击任意一级即可筛选</p></div>
      <span>{tree.length} 个学科</span></header>
    <label className="knowledge-tree-search">
      <Search size={14} /><input value={query} onChange={(event) => setQuery(event.target.value)}
        placeholder="搜索学科、章节或知识点…" aria-label="搜索知识点分类" />
      {query ? <button type="button" aria-label="清除知识点搜索" onClick={() => setQuery("")}><X size={12} /></button> : null}
    </label>
    <ul className="knowledge-tree" role="tree">
      {visible.length ? visible.map((node) => <TreeBranch key={node.key} node={node}
        selectedKey={selection?.key} expanded={expanded} searching={Boolean(query.trim())}
        onToggle={toggle} onSelect={select} />) : <li className="knowledge-tree-empty">没有匹配的知识点</li>}
    </ul>
    <footer><span>当前分类</span><strong>{selectionPath(selection)}</strong>
      {selection ? <button type="button" onClick={() => onChange(null)}>清除筛选</button> : null}</footer>
  </aside>;
}
