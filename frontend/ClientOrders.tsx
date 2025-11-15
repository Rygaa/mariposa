import { __actions } from "../../store/actions/index.actions";
import React from "react";
import useZustandStore from "../../store/store";
import type { MenuItem } from "shared/generated/prisma/client";
import useOpenDropdown from "../../hooks/useOpenDropdown";
import SelectTableModal from "./components/SelectTableModal";
import { Item } from "./components/Item";
import InfiniteScroller from "../../components/InfiniteScroller";
import Icon from "../../components/Icon/Icon";
import AutoSizer from "../../components/AutoSizer";
import { Button } from "../../components/Button";

const ClientOrders = () => {
  const [data, setData] = React.useState<any>();
  const zustandStore = useZustandStore();
  const __action_createOrder = __actions.order.useCreateOrder();
  const __action_updateOrderStatus = __actions.order.useUpdateOrderStatus();
  const [isViewMyCommandsModalOpen, setIsViewMyCommandsModalOpen] = React.useState(false);
  const _dropdown = useOpenDropdown();
  const [isSelectingTableModalOpen, setIsSelectingTableModalOpen] = React.useState(false);
  const [resetTrigger, setResetTrigger] = React.useState(false);
  const horizontalRef = React.useRef<HTMLDivElement>(null);

  React.useEffect(() => {
    const el = horizontalRef.current;
    if (!el) return;

    const handleScroll = () => {
      const nearRight = el.scrollLeft + el.clientWidth >= el.scrollWidth - 5;
      const nearLeft = el.scrollLeft <= 0;

      if (nearRight) {
        // jump back to start
        el.scrollTo({ left: 1, behavior: "smooth" });
      } else if (nearLeft) {
        // jump to end
        el.scrollTo({ left: el.scrollWidth - el.clientWidth - 1, behavior: "smooth" });
      }
    };

    el.addEventListener("scroll", handleScroll);
    return () => el.removeEventListener("scroll", handleScroll);
  }, []);

  // React.useEffect(() => {
  //   async function rr() {
  //     const selectedItem = zustandStore.eatingTables.find(
  //       (item) => item.id === "52d37d4f-a348-4a4f-8227-b8b94fbb0ecc"
  //     );
  //     setData({ ...data, eatingTable: selectedItem });

  //     await __action_createOrder.trigger(selectedItem);
  //     setIsSelectingTableModalOpen(false);

  //     zustandStore.setIsLoading(false);
  //   }

  //   rr();
  // }, [zustandStore.eatingTables, zustandStore.isLoading]);

  // Load supplements when component mounts

  React.useEffect(() => {
    if (zustandStore.menuLists.length > 0 && !data?.menuList) {
      setData((prev: any) => {
        return {
          ...prev,
          menuList: zustandStore.menuLists[1],
        };
      });
    }
  }, [zustandStore.menuLists]);

  React.useEffect(() => {
    console.log(`zustandStore: ${zustandStore.isLoading}`);
  }, [zustandStore.isLoading]);

  // const __action_updateOrderStatus = __actions.order.useUpdateOrderStatus();
  async function confirmCommandOnClick() {
    zustandStore.setIsLoading(true);
    await __action_updateOrderStatus.trigger(zustandStore.currentOrder.id, "CONFIRMED");
    const _res = await __action_createOrder.trigger(data.eatingTable);
    setResetTrigger((prev) => !prev);
    zustandStore.setIsLoading(false);

    if (_res) {
      setIsViewMyCommandsModalOpen(false);
    }
  }

  // async function yourCommandsOnClick() {
  //   setIsViewMyCommandsModalOpen(true);
  // }

  async function openMenuOnClick() {
    setIsSelectingTableModalOpen(true);
  }

  async function chooseTableOnChange(e: React.ChangeEvent<HTMLSelectElement>) {
    const optionId = e.target.value;
    console.log("Selected option ID:", optionId);
    zustandStore.setIsLoading(true);

    const selectedItem = zustandStore.eatingTables.find((item) => item.id === optionId);
    setData({ ...data, eatingTable: selectedItem });

    await __action_createOrder.trigger(selectedItem);
    setIsSelectingTableModalOpen(false);

    zustandStore.setIsLoading(false);
  }

  const clickCountRef = React.useRef(0);
  const timeoutRef = React.useRef(null as ReturnType<typeof setTimeout> | null);

  const handleClick = () => {
    // Clear previous timer
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }

    // Increment click count
    clickCountRef.current += 1;

    // If clicked 3 times, execute and reset
    if (clickCountRef.current === 3) {
      openMenuOnClick();
      clickCountRef.current = 0;
      return;
    }

    // Start/reset the 2-second timeout
    timeoutRef.current = setTimeout(() => {
      clickCountRef.current = 0;
    }, 2000);
  };

  return zustandStore.menuLists.length > 0 ? (
    <div className="flex flex-col h-full">
      <button
        className="fixed top-3 right-3 sm:top-4 sm:right-4 bg-gray-500 text-white p-2 sm:p-3 rounded text-sm sm:text-base z-50 opacity-0"
        ref={_dropdown.toggleRef}
        // onClick={() => setIsSelectingTableModalOpen(true)}
        // onClick={openMenuOnClick}
        onClick={handleClick}
      >
        Changer de table
      </button>

      <SelectTableModal
        data={data}
        chooseTableOnChange={chooseTableOnChange}
        isOpen={isSelectingTableModalOpen}
        setIsOpen={setIsSelectingTableModalOpen}
      />
      <div className="flex flex-col items-start mx-4 mt-4">
        <p className="text-[var(--textPrimary)] text-2xl sm:text-3xl md:text-4xl text-left font-bold">
          Bienvenue à Mariposa
        </p>
        <p className="text-[var(--textPrimary)] text-base sm:text-lg md:text-xl text-left font-medium mt-2">
          Un havre de paix pour savourer une infusion, des douceurs… et l’instant présent.
        </p>
        {data?.eatingTable?.name ? (
          <p className="text-base sm:text-lg md:text-xl  font-medium text-red-500 mt-2">
            Vous êtes à la {data?.eatingTable?.name}.
          </p>
        ) : (
          <p className="text-base sm:text-lg md:text-xl  font-medium text-red-500 mt-2">
            Veuillez selectionner une table.
          </p>
        )}
      </div>

      <InfiniteScroller
        autoScroll
        speed={0.1}
        className="flex my-4 overflow-x-auto whitespace-nowrap gap-x-5 bg-gray-50"
      >
        {zustandStore.menuLists
          .filter((menuList) => !menuList.isUnlisted)
          // sort by index but if index === 0 put it last
          .sort((a, b) => {
            if (a.index === 0) return 1;
            if (b.index === 0) return -1;
            return a.index - b.index;
          })
          .map((menuList) => (
            <div
              style={{
                borderBottom: "5px solid transparent",
                color:
                  data?.menuList?.id === menuList.id ? "var(--primary-button-text)" : "var(--textPrimary)",
                borderBottomColor:
                  data?.menuList?.id === menuList.id ? "var(--primary-button-background)" : "transparent",
              }}
              onClick={() => setData({ ...data, menuList })}
              key={menuList.id}
              className="flex-shrink-0 flex items-center justify-center cursor-pointer py-3 px-6 h-full"
            >
              <Icon iconname={menuList.iconname} />
              <p
                style={{
                  color:
                    data?.menuList?.id === menuList.id ? "var(--primary-button-text)" : "var(--textPrimary)",
                }}
                className="font-semibold text-[13.5px] sm:text-[20px] tracking-wider text-black pb-2 px-5"
              >
                {menuList.name}
              </p>
            </div>
          ))}
      </InfiniteScroller>

      <AutoSizer
        style={{
          objectFit: "contain",
          flexWrap: "wrap",
          overflowY: "scroll",
        }}
      >
        {data?.eatingTable?.name ? (
          zustandStore.menuItems
            .sort((a, b) => {
              if (a.image && !b.image) return -1;
              if (!a.image && b.image) return 1;
              return a.price - b.price;
            })
            .map((item) => {
              let shouldHide = false;

              if (data?.menuList) {
                shouldHide = !data.menuList.menuItemContainer.some(
                  (menuItem: MenuItem) => menuItem.id === item.id
                );
              }

              if (data?.searchQuery && !item.name.toLowerCase().includes(data.searchQuery.toLowerCase())) {
                shouldHide = true;
              }

              return (
                <Item
                  shouldHide={shouldHide}
                  key={item.id}
                  id={item.id}
                  menuItem={item}
                  eatingTable={data?.eatingTable}
                  order={zustandStore.currentOrder}
                  deleteButton={true}
                  viewMyCommandModal={isViewMyCommandsModalOpen}
                  resetTrigger={resetTrigger}
                />
              );
            })
        ) : (
          <p className="text-gray-500 text-lg font-medium w-full text-center">
            Veuillez sélectionner une table pour voir le menu.
          </p>
        )}
      </AutoSizer>
      <div className="flex justify-end items-center gap-x-6 h-[100px] border-t border-gray-300">
        <p className="text-[var(--textPrimary)] text-xl font-medium">
          Total: &nbsp;
          {zustandStore.currentOrder?._totalPrice}
          &nbsp;
        </p>
        <Button
          onClick={confirmCommandOnClick}
          text="Confirmer"
          size="lg"
          className="mr-4"
          style={{
            backgroundImage: "linear-gradient(90deg, #71b8cfff 0%, #52c4c2ff 50%, #4bc0a3ff 100%)",
          }}
        />
      </div>

      {/* {data?.eatingTable && zustandStore.currentOrder && (
        <ViewMyCommandsModal
          isOpen={isViewMyCommandsModalOpen}
          setIsOpen={setIsViewMyCommandsModalOpen}
          eatingTable={data?.eatingTable}
          confirmCommandOnClick={confirmCommandOnClick}
          __action_updateOrderStatus={__action_updateOrderStatus}
        />
      )} */}
    </div>
  ) : null;
};

export default ClientOrders;
