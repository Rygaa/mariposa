import type { ModalProps } from "../../../_enums";
import Modal from "../../../components/Modal";
import { __actions } from "../../../store/actions/index.actions";
import React from "react";
import useZustandStore from "../../../store/store";

interface SelectTableModalProps extends ModalProps {
  data: any;
  chooseTableOnChange: (e: React.ChangeEvent<HTMLSelectElement>) => void;
}

const SelectTableModal = (props: SelectTableModalProps) => {
  const zustandStore = useZustandStore();

  return (
    <Modal isOpen={props.isOpen} setIsOpen={props.setIsOpen}>
      <div className="w-full flex flex-col items-start p-4 sm:p-6">
        <p className="text-[var(--textPrimary)] text-xl sm:text-2xl lg:text-3xl font-medium text-left mb-4">
          Sélectionner une table:
        </p>
        <div className="w-full">
          <select
            value={props.data?.eatingTable?.id || ""}
            className="w-full border border-gray-300 rounded box-border p-2 sm:p-3 text-sm sm:text-base"
            onChange={props.chooseTableOnChange}
          >
            <option value="">-- Choisissez une table --</option>

            {zustandStore.eatingTables.map((item) => (
              <option key={item.id} value={item.id}>
                {item.name}
              </option>
            ))}
          </select>
        </div>
      </div>
    </Modal>
  );
};

export default SelectTableModal;
