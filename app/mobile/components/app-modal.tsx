import React, { useEffect } from "react";
import { Modal, ModalProps } from "react-native";

import { TouchCapture } from "@/components/uat/touch-capture";
import * as uat from "@/shared/uat/recorder";

/**
 * Drop-in replacement for React Native's Modal.
 * Modals render outside the app root, so this adds UAT touch logging inside
 * them and logs when the modal opens/closes (dev builds only).
 */
export function AppModal({
  name,
  visible,
  children,
  ...rest
}: ModalProps & { name: string }) {
  useEffect(() => {
    if (!__DEV__) return;
    if (visible) {
      uat.openModal(name);
      return () => uat.closeModal(name);
    }
  }, [visible, name]);

  return (
    <Modal visible={visible} {...rest}>
      <TouchCapture style={{ flex: 1 }}>{children}</TouchCapture>
    </Modal>
  );
}
