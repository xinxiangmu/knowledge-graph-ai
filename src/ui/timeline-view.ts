import { el, svgEl } from '../utils/dom-helper.js';

export interface TimelineNode {
  id: string;
  summary: string;
  timestamp: number;
  tags: string[];
  filePath: string;
  docId: string;
}

export interface TimelineViewProps {
  nodes: TimelineNode[];
  onNodeClick: (node: TimelineNode) => void;
  onNodeClickClose?: () => void;
}

export class TimelineView {
  private container: any;
  private props: TimelineViewProps;
  private virtualScroll: VirtualScroller;
  private observer: IntersectionObserver | null = null;
  private itemHeight: number = 120;
  private itemWidth: number = 300;

  constructor(container: any, props: TimelineViewProps) {
    this.container = container;
    this.props = props;
    this.virtualScroll = new VirtualScroller(
      this.props.nodes,
      this.itemHeight,
      this.itemWidth
    );
    this.render();
  }

  private render(): void {
    this.container.replaceChildren();
    this.container.classList.add('timeline-container');

    const wrapper = el('div', { cls: 'timeline-wrapper' });

    if (this.props.nodes.length === 0) {
      const emptyState = el('div', { cls: 'timeline-empty', text: '暂无时间线数据' });
      wrapper.appendChild(emptyState);
    } else {
      const spine = el('div', { cls: 'timeline-spine' });
      wrapper.appendChild(spine);

      const track = el('div', { cls: 'timeline-track' });

      const sortedNodes = [...this.props.nodes].sort((a, b) => b.timestamp - a.timestamp);

      sortedNodes.forEach((node, index) => {
        const isLeft = index % 2 === 0;
        const item = this.createTimelineItem(node, index, isLeft);
        track.appendChild(item);
      });

      wrapper.appendChild(track);
      this.setupIntersectionObserver(track);
    }

    this.container.appendChild(wrapper);
  }

  private createTimelineItem(node: TimelineNode, index: number, isLeft: boolean): any {
    const item = el('div', {
      cls: `timeline-item ${isLeft ? 'left' : 'right'}`,
      dataset: { index: index.toString() },
    });

    const nodeCircle = el('div', { cls: 'timeline-node' });

    const content = el('div', { cls: 'timeline-content' });

    const card = el('div', { cls: 'timeline-card' });

    const dateDiv = el('div', { cls: 'timeline-date', text: this.formatDate(node.timestamp) });
    card.appendChild(dateDiv);

    const summaryDiv = el('div', { cls: 'timeline-summary', text: node.summary });
    card.appendChild(summaryDiv);

    const detailsDiv = el('div', { cls: 'timeline-details' });

    const fileIcon = svgEl('svg', { attr: { width: '12', height: '12', viewBox: '0 0 24 24', fill: 'none', stroke: 'currentColor', 'stroke-width': '2' } });
    const filePath = svgEl('path', { attr: { d: 'M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z' } });
    const filePolyline = svgEl('polyline', { attr: { points: '14 2 14 8 20 8' } });
    const fileLine1 = svgEl('line', { attr: { x1: '16', y1: '13', x2: '8', y2: '13' } });
    const fileLine2 = svgEl('line', { attr: { x1: '16', y1: '17', x2: '8', y2: '17' } });
    fileIcon.appendChild(filePath);
    fileIcon.appendChild(filePolyline);
    fileIcon.appendChild(fileLine1);
    fileIcon.appendChild(fileLine2);
    const fileNameSpan = el('span', { text: (node.filePath || '').split('/').pop() || 'Unknown file' });
    const fileRow = el('div');
    fileRow.appendChild(fileIcon);
    fileRow.appendChild(fileNameSpan);
    detailsDiv.appendChild(fileRow);

    const timeIcon = svgEl('svg', { attr: { width: '12', height: '12', viewBox: '0 0 24 24', fill: 'none', stroke: 'currentColor', 'stroke-width': '2' } });
    const timeCircle = svgEl('circle', { attr: { cx: '12', cy: '12', r: '10' } });
    const timePolyline = svgEl('polyline', { attr: { points: '12 6 12 12 16 14' } });
    timeIcon.appendChild(timeCircle);
    timeIcon.appendChild(timePolyline);
    const timeSpan = el('span', { text: this.formatTime(node.timestamp) });
    const timeRow = el('div');
    timeRow.appendChild(timeIcon);
    timeRow.appendChild(timeSpan);
    detailsDiv.appendChild(timeRow);

    card.appendChild(detailsDiv);

    const tagsDiv = el('div', { cls: 'timeline-tags' });
    (node.tags || []).forEach(tag => {
      const tagSpan = el('span', { cls: 'timeline-tag', text: tag });
      tagsDiv.appendChild(tagSpan);
    });
    card.appendChild(tagsDiv);

    card.addEventListener('click', () => {
      this.props.onNodeClick(node);
      this.props.onNodeClickClose?.();
    });

    content.appendChild(card);
    item.appendChild(content);
    item.appendChild(nodeCircle);

    return item;
  }

  private setupIntersectionObserver(track: any): void {
    const items = track.querySelectorAll('.timeline-item');

    if (typeof IntersectionObserver === 'undefined') {
      items.forEach((item: any) => {
        item.classList.add('visible');
      });
      return;
    }

    this.observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add('visible');
          }
        });
      },
      {
        root: this.container,
        threshold: 0.1,
        rootMargin: '50px',
      }
    );

    items.forEach((item: any) => {
      if (this.observer) {
        this.observer.observe(item);
      }
    });
  }

  private formatDate(timestamp: number): string {
    const date = new Date(timestamp);
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }

  private formatTime(timestamp: number): string {
    const date = new Date(timestamp);
    const hours = String(date.getHours()).padStart(2, '0');
    const minutes = String(date.getMinutes()).padStart(2, '0');
    return `${hours}:${minutes}`;
  }

  private escapeHtml(text: string): string {
    const div = el('div');
    div.textContent = text;
    return div.innerHTML;
  }

  public updateNodes(nodes: TimelineNode[]): void {
    this.props.nodes = nodes;
    this.virtualScroll = new VirtualScroller(nodes, this.itemHeight, this.itemWidth);
    this.render();
  }

  public destroy(): void {
    if (this.observer) {
      this.observer.disconnect();
      this.observer = null;
    }
    this.container.replaceChildren();
    this.container.classList.remove('timeline-container');
  }
}

class VirtualScroller {
  private nodes: TimelineNode[];
  private itemHeight: number;
  private itemWidth: number;

  constructor(nodes: TimelineNode[], itemHeight: number, itemWidth: number) {
    this.nodes = nodes;
    this.itemHeight = itemHeight;
    this.itemWidth = itemWidth;
  }

  public getVisibleRange(scrollLeft: number, containerWidth: number): { start: number; end: number } {
    const buffer = 2;
    const start = Math.max(0, Math.floor(scrollLeft / this.itemWidth) - buffer);
    const visibleCount = Math.ceil(containerWidth / this.itemWidth) + buffer * 2;
    const end = Math.min(this.nodes.length, start + visibleCount);
    return { start, end };
  }

  public getTotalWidth(): number {
    return this.nodes.length * this.itemWidth;
  }

  public getNodes(): TimelineNode[] {
    return this.nodes;
  }
}
