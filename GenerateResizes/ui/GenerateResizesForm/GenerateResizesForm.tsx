import { useCallback, useEffect, useMemo, useState } from 'react';
import { useSelector } from 'react-redux';

import { notify } from 'shared/lib/notify/notify';
import { Button } from 'shared/ui/Button/Button';

import { getKeyVisualId } from 'entities/Editor';
import { useGetAdsCompany } from 'entities/AdsCompany';
import { useGetKeyVisual } from 'entities/KeyVisual';
import { useGetKeyVisualResizesByAdsCompany } from 'entities/KeyVisualResize';
import { useGetOrientations } from 'entities/Orientation';

import {
  PlatformAccardion,
  PlatformAccardionOption,
} from 'pages/KeyVisual/KeyVisualResizesPage/ui/ResizeListForm/PlatformAccardion/PlatformAccardion';
import { Platform, PlatformFormat, useGetPlatforms } from 'entities/Platform';
import { PlatformSize, useGetAllPlatformsSizes } from 'entities/PlatformSize';
import { Switch } from 'shared/ui/Switch/Switch';
import { CreateRenderTask } from 'entities/RenderTask';
import cls from './GenerateResizesForm.module.scss';
import { useGenerateResizes } from '../../model/hooks/useGenerateResizes';

interface GenerateResizesFormProps {
  onCancel: () => void;
}

export const GenerateResizesForm = ({ onCancel }: GenerateResizesFormProps) => {
  const [isRenderTaskRunning, setIsRenderTaskRunning] = useState(false);
  const [isAllResizes, setIsAllResizes] = useState(true);
  const [selectedResizeIds, setSelectedResizeIds] = useState<ID[]>([]);
  const [selectedFormatsMap, setSelectedFormatsMap] = useState<Record<string, string>>({});

  const keyVisualId = useSelector(getKeyVisualId);
  const generateResizes = useGenerateResizes();

  const { data: keyVisual } = useGetKeyVisual(keyVisualId, { skip: !keyVisualId });
  const { data: resizes } = useGetKeyVisualResizesByAdsCompany(
    { ads_company_id: keyVisual?.ads_company_id! },
    { skip: !keyVisual?.ads_company_id },
  );
  const { data: platforms } = useGetPlatforms();
  const { data: groupPlatformSizes } = useGetAllPlatformsSizes();

  const {
    data: adsCompanyData,
    isUninitialized,
    refetch,
  } = useGetAdsCompany(keyVisual?.ads_company.human_id || '', {
    skip: !keyVisual?.ads_company.human_id,
  });

  const { data: orientations } = useGetOrientations();

  const platformSizes = useMemo<PlatformSize[]>(
    () => groupPlatformSizes?.data.reduce<PlatformSize[]>((acc, curr) => [...acc, ...curr.platform_sizes], []) || [],
    [groupPlatformSizes],
  );

  const platformSizesMap = useMemo<Record<ID, PlatformSize>>(() => {
    const map: Record<ID, PlatformSize> = {};

    platformSizes.forEach((platformSize) => {
      map[platformSize.id] = platformSize;
    });

    return map;
  }, [platformSizes]);

  const resizesMapByPlatformId = useMemo<Record<ID, PlatformAccardionOption[]>>(() => {
    if (!resizes) return {};

    return resizes.reduce((acc, resize) => {
      return {
        ...acc,
        [resize.platform_id]: [
          ...(acc[resize.platform_id] || []),
          {
            id: resize.id,
            width: resize.platform_size.width,
            height: resize.platform_size.height,
            orientation_type: resize.platform_size.orientation_type,
            max_weight: resize.platform_size.max_weight,
          },
        ],
      };
    }, {} as Record<ID, PlatformAccardionOption[]>);
  }, [resizes, platformSizesMap]);

  const platformsMap = useMemo<Record<ID, Platform>>(() => {
    const map: Record<ID, Platform> = {};

    platforms?.forEach((platform) => {
      map[platform.id] = platform;
    });

    return map;
  }, [platforms]);

  const platformOptions = useMemo<Platform[]>(
    () => platforms?.filter((platform) => resizesMapByPlatformId[platform.id]) || [],
    [platforms],
  );

  useEffect(() => {
    const map: Record<string, string> = {};

    resizes?.forEach((resize) => {
      map[resize.id] = 'psd';
    });

    setSelectedFormatsMap(map);
  }, [resizes, platformSizesMap]);

  const handleSubmit = useCallback(async () => {
    try {
      setIsRenderTaskRunning(true);

      if (!adsCompanyData) {
        throw Error('No Key Visual');
      }

      if (!isAllResizes && !selectedResizeIds.length) {
        throw Error('emptyList');
      }

      const renderTask: CreateRenderTask = {
        ads_company_id: adsCompanyData.adsCompany._id,
        key_visual_ids: adsCompanyData.keyVisuals.filter((kv) => kv.data.frames).map(({ id }) => id),
        key_visual_resizes: [],
      };

      if (isAllResizes) {
        renderTask.key_visual_resizes = resizes?.map((resize) => ({
          id: resize.id,
          export_type: platformsMap[resize.platform_id].format,
          is_for_revision: false,
        }));
      } else {
        renderTask.key_visual_resizes = resizes?.map((resize) => {
          const selectedResize = selectedResizeIds.includes(resize.id);
          return {
            id: resize.id,
            export_type: selectedResize
              ? (selectedFormatsMap[resize.id] as PlatformFormat)
              : platformsMap[resize.platform_id].format,
            is_for_revision: !!selectedResize,
          };
        });
      }

      await generateResizes(renderTask);

      if (!isUninitialized) refetch();
      notify('success', 'Ресайзы успешно сгенерированы');
      onCancel();
    } catch (unknownError) {
      const error = unknownError as Error;
      if (error.message === 'emptyList') {
        notify('warning', 'Выберите ресайз');
      } else {
        notify('error', 'Ошибка генерации ресайзов');
      }
    } finally {
      setIsRenderTaskRunning(false);
    }
  }, [
    generateResizes,
    refetch,
    isUninitialized,
    notify,
    adsCompanyData,
    selectedResizeIds,
    selectedFormatsMap,
    isAllResizes,
  ]);

  return (
    <>
      <h5 className={cls.title}>
        Ресайзы будут подготовлены по техническим требованиям рекламных площадок. Если есть ресайзы, требующие доработки
        в сторонней программе, выберите их:
      </h5>

      <div className={cls.switchField}>
        <Switch value={isAllResizes} onToggle={() => setIsAllResizes(true)} />
        <span>Подготовить все ресайзы</span>
      </div>
      <div className={cls.switchField}>
        <Switch value={!isAllResizes} onToggle={() => setIsAllResizes(false)} />
        <span>Выбрать для доработки</span>
      </div>

      {!isAllResizes && orientations && (
        <div className={cls.accardionWrapper}>
          {platformOptions?.map((platform) => (
            <PlatformAccardion
              key={platform.id}
              title={platform.name}
              logo={platform.logo_url}
              options={resizesMapByPlatformId[platform.id]}
              value={selectedResizeIds}
              formatsMap={selectedFormatsMap}
              onChange={setSelectedResizeIds}
              onChangeFormatsMap={setSelectedFormatsMap}
              url={platform.requirements_url}
              orientations={orientations.orientations}
            />
          ))}
        </div>
      )}

      <div className={cls.footer}>
        <Button theme="outline" text="Отменить" isFetching={isRenderTaskRunning} onClick={onCancel} />
        <Button
          theme="filled"
          text="Сгенерировать"
          color="accent"
          isFetching={isRenderTaskRunning}
          onClick={handleSubmit}
        />
      </div>
    </>
  );
};
