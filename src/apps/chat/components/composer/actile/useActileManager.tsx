import * as React from 'react';
import { ActileItem, ActileProvider } from './ActileProvider';
import { ActilePopup } from './ActilePopup';


export const useActileManager = (providers: ActileProvider[], anchorRef: React.RefObject<HTMLElement>) => {

  // state
  const [popupOpen, setPopupOpen] = React.useState(false);
  const [provider, setProvider] = React.useState<ActileProvider | null>(null);

  const [items, setItems] = React.useState<ActileItem[]>([]);
  const [activeSearchString, setActiveSearchString] = React.useState<string>('');
  const [activeItemIndex, setActiveItemIndex] = React.useState<number>(0);


  // derived state
  const activeItems = React.useMemo(() => {
    const search = activeSearchString.trim().toLowerCase();
    return items.filter(item => item.label.toLowerCase().startsWith(search));
  }, [items, activeSearchString]);
  const activeItem = activeItemIndex >= 0 && activeItemIndex < activeItems.length ? activeItems[activeItemIndex] : null;


  const handleClose = React.useCallback(() => {
    setPopupOpen(false);
    setProvider(null);
    setItems([]);
    setActiveSearchString('');
    setActiveItemIndex(0);
  }, []);

  const handlePopupItemClicked = React.useCallback((item: ActileItem) => {
    provider?.onItemSelect(item);
    handleClose();
  }, [handleClose, provider]);

  const handleEnterKey = React.useCallback(() => {
    activeItem && handlePopupItemClicked(activeItem);
  }, [activeItem, handlePopupItemClicked]);


  const actileInterceptKeydown = React.useCallback((_event: React.KeyboardEvent<HTMLTextAreaElement>): boolean => {

    // Popup open: Intercept

    const { key, currentTarget, ctrlKey, metaKey } = _event;

    if (popupOpen) {
      if (key === 'Escape' || key === 'ArrowLeft') {
        _event.preventDefault();
        handleClose();
      } else if (key === 'ArrowUp') {
        _event.preventDefault();
        setActiveItemIndex((prevIndex) => (prevIndex > 0 ? prevIndex - 1 : activeItems.length - 1));
      } else if (key === 'ArrowDown') {
        _event.preventDefault();
        setActiveItemIndex((prevIndex) => (prevIndex < activeItems.length - 1 ? prevIndex + 1 : 0));
      } else if (key === 'Enter' || key === 'ArrowRight' || key === 'Tab' || (key === ' ' && activeItems.length === 1)) {
        _event.preventDefault();
        handleEnterKey();
      } else if (key === 'Backspace') {
        handleClose();
      } else if (key.length === 1 && !ctrlKey && !metaKey) {
        setActiveSearchString((prev) => prev + key);
        setActiveItemIndex(0);
      }
      return true;
    }

    // Popup closed: Check for triggers

    // optimization
    if (key !== '/' && key !== '@')
      return false;

    const trailingText = (currentTarget.value || '') + key;

    // check all rules to find one that triggers
    for (const provider of providers) {
      if (provider.checkTriggerText(trailingText)) {
        setProvider(provider);
        setPopupOpen(true);
        setActiveSearchString(key);
        provider
          .fetchItems()
          .then(items => setItems(items))
          .catch(error => {
            handleClose();
            console.error('Failed to fetch popup items:', error);
          });
        return true;
      }
    }

    return false;
  }, [activeItems.length, handleClose, handleEnterKey, popupOpen, providers]);


  const actileComponent = React.useMemo(() => {
    return !popupOpen ? null : (
      <ActilePopup
        anchorEl={anchorRef.current}
        onClose={handleClose}
        title={provider?.title}
        items={activeItems}
        activeItemIndex={activeItemIndex}
        activePrefixLength={activeSearchString.length}
        onItemClick={handlePopupItemClicked}
      />
    );
  }, [activeItemIndex, activeItems, activeSearchString.length, anchorRef, handleClose, handlePopupItemClicked, popupOpen, provider?.title]);

  return {
    actileComponent,
    actileInterceptKeydown,
  };
};