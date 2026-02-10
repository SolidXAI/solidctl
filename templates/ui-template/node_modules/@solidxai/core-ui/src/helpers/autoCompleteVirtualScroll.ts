type GetVirtualScrollerOptionsParams = {
  itemsLength: number;
  maxVisibleItems?: number;
  itemHeight?: number;
  extraHeight?: number;
  lazy?: boolean;
  onLazyLoad?: (event: any) => void;
};

export const getVirtualScrollerOptions = ({
  itemsLength,
  maxVisibleItems = 5,
  itemHeight = 38,
  extraHeight = 24,
  lazy = false,
  onLazyLoad,
}: GetVirtualScrollerOptionsParams) => {

  if (itemsLength === 0) {
    return undefined;
  }

  const visibleItems = Math.min(itemsLength, maxVisibleItems);

  const options: any = {
    itemSize: itemHeight,
    scrollHeight: `${
      visibleItems * itemHeight + extraHeight
    }px`,
  };

  // Lazy loading support
  if (lazy) {
    options.lazy = true;
    if (onLazyLoad) {
      options.onLazyLoad = onLazyLoad;
    }
  }

  return options;
};
