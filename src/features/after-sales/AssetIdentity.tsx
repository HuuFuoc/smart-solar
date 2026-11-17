// Cách nhận ra một dòng thiết bị: số serial, hoặc số lượng khi dòng là một lô ghi theo số lượng (không có serial)
export function AssetIdentity({ asset }: { asset: { serialNumber: string | null; quantity: number } }) {
  return asset.serialNumber ? (
    <>
      Serial <span className="tnum">{asset.serialNumber}</span>
    </>
  ) : (
    <>
      Ghi theo số lượng, <span className="tnum">{asset.quantity.toLocaleString('vi-VN')}</span> thiết bị
    </>
  )
}
