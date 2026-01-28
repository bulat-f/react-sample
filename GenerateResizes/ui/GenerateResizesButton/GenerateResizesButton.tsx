import { useCallback, useMemo, useRef, useState } from 'react';
import { useSelector } from 'react-redux';

import { classNames } from 'shared/lib/classNames/classNames';
import { downloadFile } from 'shared/lib/downloadFile/downloadFile';

import { notify } from 'shared/lib/notify/notify';
import { Tooltip } from 'shared/ui/Tooltip/Tooltip';
import { Button } from 'shared/ui/Button/Button';
import { ReactComponent as WandIcon } from 'shared/assets/icons/wand.svg';
import { ReactComponent as DownloadIcon } from 'shared/assets/icons/download.svg';
import { ReactComponent as ShareIcon } from 'shared/assets/icons/share.svg';

import { getKeyVisualId } from 'entities/Editor';
import { useGetAdsCompany } from 'entities/AdsCompany';
import { useGetKeyVisual } from 'entities/KeyVisual';

import cls from './GenerateResizesButton.module.scss';
import { Modal } from 'shared/ui/Modal/Modal';
import { GenerateResizesForm } from 'features/GenerateResizes';
import { PreviewLinkType, useCreatePreviewLink, useGetPreviewLinks } from 'entities/Preview';
import { Overlay } from 'shared/ui/Overlay/Overlay';
import { LinkShare } from 'widgets/LinkShare';

interface GenerateResizesButtonProps {
  isAvailable?: boolean;
  text?: string;
  share?: boolean;
}
export const GenerateResizesButton = ({ isAvailable, text, share = true }: GenerateResizesButtonProps) => {
  const linkShareTarget = useRef(null);

  const keyVisualId = useSelector(getKeyVisualId);
  const [showModal, setShowModal] = useState(false);
  const [showLinkShare, setShowLinkShare] = useState(false);

  const [createPreviewLink] = useCreatePreviewLink();

  const { data: keyVisual } = useGetKeyVisual(keyVisualId, { skip: !keyVisualId });

  const { data: adsCompanyData } = useGetAdsCompany(keyVisual?.ads_company.human_id || '', {
    skip: !keyVisual?.ads_company.human_id,
  });

  const { data: previewLinks } = useGetPreviewLinks();

  const handleShowModal = useCallback(() => setShowModal(true), [setShowModal]);
  const handleHideModal = useCallback(() => setShowModal(false), [setShowModal]);

  const downloadLink = useMemo(
    () => adsCompanyData?.adsCompany.creative_url,
    [adsCompanyData?.adsCompany.creative_url],
  );

  const previewLink = useMemo(() => {
    return previewLinks?.find((link) => {
      return link.type === PreviewLinkType.RESIZE && adsCompanyData?.adsCompany._id === link.ads_company_id;
    });
  }, [previewLinks, adsCompanyData?.adsCompany._id]);

  const handleDownload = useCallback(() => {
    downloadLink && downloadFile(downloadLink);
  }, [adsCompanyData?.adsCompany.creative_url]);

  const handleShowLinkShare = useCallback(() => {
    setShowLinkShare((prev) => !prev);
  }, [setShowLinkShare]);

  const handleCopyLink = useCallback(async () => {
    try {
      const response = await createPreviewLink({
        ads_company_id: adsCompanyData?.adsCompany?._id,
        type: PreviewLinkType.RESIZE,
      }).unwrap();

      const link = window.location.origin + response.link;
      navigator.clipboard.writeText(link);
    } catch {
      notify('error', 'Ошибка копирования ссылки');
    }
  }, [adsCompanyData, createPreviewLink]);

  return (
    <>
      <Tooltip text={isAvailable ? 'Сгенерировать ресайзы' : 'Подтвердите все комментарии'} className={cls.tooltip}>
        <div className={cls.buttonGroup}>
          <Button
            className={classNames(cls.button, { [cls.disabled]: !isAvailable, [cls.bigSizeBtn]: text })}
            Icon={WandIcon}
            theme={isAvailable ? 'filled' : 'default'}
            color={isAvailable ? 'accent' : 'black'}
            onClick={handleShowModal}
            disabled={!isAvailable}
            text={text}
          />
        </div>
      </Tooltip>
      <Modal show={showModal} title="Генерация ресайзов" onHide={handleHideModal}>
        <GenerateResizesForm onCancel={handleHideModal} />
      </Modal>

      <div className={cls.buttonGroup}>
        {downloadLink && (
          <Tooltip text="Скачать ресайзы">
            <Button
              className={classNames(cls.button, {}, [cls.downloadButton])}
              Icon={DownloadIcon}
              theme="default"
              color="accent"
              onClick={handleDownload}
            />
          </Tooltip>
        )}
        {share && (
          <>
            <Tooltip text="Поделиться ресайзами">
              <div ref={linkShareTarget}>
                <Button
                  className={cls.button}
                  Icon={ShareIcon}
                  theme="filled"
                  color="light-gray"
                  onClick={handleShowLinkShare}
                />
              </div>
            </Tooltip>
            <Overlay
              className={cls.overlay}
              title="Поделиться ресайзами"
              target={linkShareTarget}
              show={showLinkShare}
              placement="right"
              onClose={handleShowLinkShare}
            >
              <LinkShare link={previewLink} onSubmit={handleCopyLink} />
            </Overlay>
          </>
        )}
      </div>
    </>
  );
};
