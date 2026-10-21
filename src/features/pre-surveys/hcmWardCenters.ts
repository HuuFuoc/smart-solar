// Điểm giữa gần đúng của từng phường, xã TP.HCM, tra theo mã phường của backend.
// Mỗi phường lấy toạ độ giữa của quận, huyện cũ mà nó được sáp nhập từ (theo bảng sáp nhập của backend),
// toạ độ quận, huyện cũ đã đối chiếu với OpenStreetMap.
// Chỉ dùng để ước tính sản lượng điện (dữ liệu nắng tính theo ô lưới rộng vài km), không dùng để chỉ đường.

const WARD_CENTERS: Record<string, [latitude: number, longitude: number]> = {
  '25747': [10.9809, 106.6537], // Phường Thủ Dầu Một, Thành phố Thủ Dầu Một cũ
  '25750': [10.9809, 106.6537], // Phường Phú Lợi, Thành phố Thủ Dầu Một cũ
  '25760': [10.9809, 106.6537], // Phường Bình Dương, Thành phố Thủ Dầu Một cũ
  '25768': [10.9809, 106.6537], // Phường Phú An, Thành phố Thủ Dầu Một cũ
  '25771': [10.9809, 106.6537], // Phường Chánh Hiệp, Thành phố Thủ Dầu Một cũ
  '25777': [11.3188, 106.4409], // Xã Dầu Tiếng, Huyện Dầu Tiếng cũ
  '25780': [11.3188, 106.4409], // Xã Minh Thạnh, Huyện Dầu Tiếng cũ
  '25792': [11.3188, 106.4409], // Xã Long Hòa, Huyện Dầu Tiếng cũ
  '25807': [11.3188, 106.4409], // Xã Thanh An, Huyện Dầu Tiếng cũ
  '25813': [11.2698, 106.6277], // Phường Bến Cát, Huyện Bàu Bàng cũ
  '25819': [11.2698, 106.6277], // Xã Trừ Văn Thố, Huyện Bàu Bàng cũ
  '25822': [11.2698, 106.6277], // Xã Bàu Bàng, Huyện Bàu Bàng cũ
  '25837': [11.2698, 106.6277], // Phường Chánh Phú Hòa, Huyện Bàu Bàng cũ
  '25840': [11.1514, 106.5987], // Phường Long Nguyên, Thành phố Bến Cát cũ
  '25843': [11.3188, 106.4409], // Phường Tây Nam, Huyện Dầu Tiếng cũ
  '25846': [11.1514, 106.5987], // Phường Thới Hòa, Thành phố Bến Cát cũ
  '25849': [11.1514, 106.5987], // Phường Hòa Lợi, Thành phố Bến Cát cũ
  '25858': [11.3402, 106.7537], // Xã Phú Giáo, Huyện Phú Giáo cũ
  '25864': [11.3402, 106.7537], // Xã Phước Thành, Huyện Phú Giáo cũ
  '25867': [11.3402, 106.7537], // Xã An Long, Huyện Phú Giáo cũ
  '25882': [11.3402, 106.7537], // Xã Phước Hòa, Huyện Phú Giáo cũ
  '25888': [11.0567, 106.756], // Phường Tân Uyên, Thành phố Tân Uyên cũ
  '25891': [11.0567, 106.756], // Phường Tân Khánh, Thành phố Tân Uyên cũ
  '25906': [11.1376, 106.8676], // Xã Bắc Tân Uyên, Huyện Bắc Tân Uyên cũ
  '25909': [11.1376, 106.8676], // Xã Thường Tân, Huyện Bắc Tân Uyên cũ
  '25912': [11.1376, 106.8676], // Phường Vĩnh Tân, Huyện Bắc Tân Uyên cũ
  '25915': [11.1376, 106.8676], // Phường Bình Cơ, Huyện Bắc Tân Uyên cũ
  '25920': [11.0567, 106.756], // Phường Tân Hiệp, Thành phố Tân Uyên cũ
  '25942': [10.906, 106.769], // Phường Dĩ An, Thành phố Dĩ An cũ
  '25945': [10.906, 106.769], // Phường Tân Đông Hiệp, Thành phố Dĩ An cũ
  '25951': [10.906, 106.769], // Phường Đông Hòa, Thành phố Dĩ An cũ
  '25966': [10.9316, 106.6969], // Phường Lái Thiêu, Thành phố Thuận An cũ
  '25969': [10.9316, 106.6969], // Phường Thuận Giao, Thành phố Thuận An cũ
  '25975': [10.9316, 106.6969], // Phường An Phú, Thành phố Thuận An cũ
  '25978': [10.9316, 106.6969], // Phường Thuận An, Thành phố Thuận An cũ
  '25987': [10.9316, 106.6969], // Phường Bình Hòa, Thành phố Thuận An cũ
  '26506': [10.3482, 107.0753], // Phường Vũng Tàu, Thành phố Vũng Tàu cũ
  '26526': [10.3482, 107.0753], // Phường Tam Thắng, Thành phố Vũng Tàu cũ
  '26536': [10.3482, 107.0753], // Phường Rạch Dừa, Thành phố Vũng Tàu cũ
  '26542': [10.3482, 107.0753], // Phường Phước Thắng, Thành phố Vũng Tàu cũ
  '26545': [10.3482, 107.0753], // Xã Long Sơn, Thành phố Vũng Tàu cũ
  '26560': [10.4933, 107.1789], // Phường Bà Rịa, Thành phố Bà Rịa cũ
  '26566': [10.4933, 107.1789], // Phường Long Hương, Thành phố Bà Rịa cũ
  '26572': [10.4933, 107.1789], // Phường Tam Long, Thành phố Bà Rịa cũ
  '26575': [10.6564, 107.2667], // Xã Ngãi Giao, Huyện Châu Đức cũ
  '26584': [10.6564, 107.2667], // Xã Xuân Sơn, Huyện Châu Đức cũ
  '26590': [10.6564, 107.2667], // Xã Bình Giã, Huyện Châu Đức cũ
  '26596': [10.6564, 107.2667], // Xã Châu Đức, Huyện Châu Đức cũ
  '26608': [10.6564, 107.2667], // Xã Kim Long, Huyện Châu Đức cũ
  '26617': [10.6564, 107.2667], // Xã Nghĩa Thành, Huyện Châu Đức cũ
  '26620': [10.6311, 107.4594], // Xã Hồ Tràm, Huyện Xuyên Mộc cũ
  '26632': [10.6311, 107.4594], // Xã Xuyên Mộc, Huyện Xuyên Mộc cũ
  '26638': [10.6311, 107.4594], // Xã Bàu Lâm, Huyện Xuyên Mộc cũ
  '26641': [10.6311, 107.4594], // Xã Hòa Hội, Huyện Xuyên Mộc cũ
  '26647': [10.6311, 107.4594], // Xã Hòa Hiệp, Huyện Xuyên Mộc cũ
  '26656': [10.6311, 107.4594], // Xã Bình Châu, Huyện Xuyên Mộc cũ
  '26659': [10.4772, 107.2765], // Xã Long Điền, Huyện Long Đất cũ
  '26662': [10.4772, 107.2765], // Xã Long Hải, Huyện Long Đất cũ
  '26680': [10.4772, 107.2765], // Xã Đất Đỏ, Huyện Long Đất cũ
  '26686': [10.4772, 107.2765], // Xã Phước Hải, Huyện Long Đất cũ
  '26704': [10.6235, 107.0546], // Phường Phú Mỹ, Thành phố Phú Mỹ cũ
  '26710': [10.6235, 107.0546], // Phường Tân Hải, Thành phố Phú Mỹ cũ
  '26713': [10.6235, 107.0546], // Phường Tân Phước, Thành phố Phú Mỹ cũ
  '26725': [10.6235, 107.0546], // Phường Tân Thành, Thành phố Phú Mỹ cũ
  '26728': [10.6235, 107.0546], // Xã Châu Pha, Thành phố Phú Mỹ cũ
  '26732': [8.682, 106.609], // Đặc khu Côn Đảo, Huyện Côn Đảo cũ
  '26737': [10.7754, 106.6996], // Phường Tân Định, Quận 1 cũ
  '26740': [10.7754, 106.6996], // Phường Sài Gòn, Quận 1 cũ
  '26743': [10.7754, 106.6996], // Phường Bến Thành, Quận 1 cũ
  '26758': [10.7754, 106.6996], // Phường Cầu Ông Lãnh, Quận 1 cũ
  '26767': [10.8613, 106.6642], // Phường An Phú Đông, Quận 12 cũ
  '26773': [10.8613, 106.6642], // Phường Thới An, Quận 12 cũ
  '26782': [10.8613, 106.6642], // Phường Tân Thới Hiệp, Quận 12 cũ
  '26785': [10.8613, 106.6642], // Phường Trung Mỹ Tây, Quận 12 cũ
  '26791': [10.8613, 106.6642], // Phường Đông Hưng Thuận, Quận 12 cũ
  '26800': [10.8231, 106.7835], // Phường Linh Xuân, Thành phố Thủ Đức cũ
  '26803': [10.8231, 106.7835], // Phường Tam Bình, Thành phố Thủ Đức cũ
  '26809': [10.8231, 106.7835], // Phường Hiệp Bình, Thành phố Thủ Đức cũ
  '26824': [10.8231, 106.7835], // Phường Thủ Đức, Thành phố Thủ Đức cũ
  '26833': [10.8231, 106.7835], // Phường Long Bình, Thành phố Thủ Đức cũ
  '26842': [10.8231, 106.7835], // Phường Tăng Nhơn Phú, Thành phố Thủ Đức cũ
  '26848': [10.8231, 106.7835], // Phường Phước Long, Thành phố Thủ Đức cũ
  '26857': [10.8231, 106.7835], // Phường Long Phước, Thành phố Thủ Đức cũ
  '26860': [10.8231, 106.7835], // Phường Long Trường, Thành phố Thủ Đức cũ
  '26876': [10.8354, 106.674], // Phường An Nhơn, Quận Gò Vấp cũ
  '26878': [10.8354, 106.674], // Phường An Hội Đông, Quận Gò Vấp cũ
  '26882': [10.8354, 106.674], // Phường An Hội Tây, Quận Gò Vấp cũ
  '26884': [10.8354, 106.674], // Phường Gò Vấp, Quận Gò Vấp cũ
  '26890': [10.8354, 106.674], // Phường Hạnh Thông, Quận Gò Vấp cũ
  '26898': [10.8354, 106.674], // Phường Thông Tây Hội, Quận Gò Vấp cũ
  '26905': [10.8123, 106.704], // Phường Bình Lợi Trung, Quận Bình Thạnh cũ
  '26911': [10.8123, 106.704], // Phường Bình Quới, Quận Bình Thạnh cũ
  '26929': [10.8123, 106.704], // Phường Bình Thạnh, Quận Bình Thạnh cũ
  '26944': [10.8123, 106.704], // Phường Gia Định, Quận Bình Thạnh cũ
  '26956': [10.8123, 106.704], // Phường Thạnh Mỹ Tây, Quận Bình Thạnh cũ
  '26968': [10.8031, 106.6525], // Phường Tân Sơn Nhất, Quận Tân Bình cũ
  '26977': [10.8031, 106.6525], // Phường Tân Sơn Hòa, Quận Tân Bình cũ
  '26983': [10.8031, 106.6525], // Phường Bảy Hiền, Quận Tân Bình cũ
  '26995': [10.8031, 106.6525], // Phường Tân Hòa, Quận Tân Bình cũ
  '27004': [10.8031, 106.6525], // Phường Tân Bình, Quận Tân Bình cũ
  '27007': [10.8031, 106.6525], // Phường Tân Sơn, Quận Tân Bình cũ
  '27013': [10.7919, 106.6278], // Phường Tây Thạnh, Quận Tân Phú cũ
  '27019': [10.7919, 106.6278], // Phường Tân Sơn Nhì, Quận Tân Phú cũ
  '27022': [10.7919, 106.6278], // Phường Phú Thọ Hòa, Quận Tân Phú cũ
  '27028': [10.7919, 106.6278], // Phường Phú Thạnh, Quận Tân Phú cũ
  '27031': [10.7919, 106.6278], // Phường Tân Phú, Quận Tân Phú cũ
  '27043': [10.801, 106.68], // Phường Đức Nhuận, Quận Phú Nhuận cũ
  '27058': [10.801, 106.68], // Phường Cầu Kiệu, Quận Phú Nhuận cũ
  '27073': [10.801, 106.68], // Phường Phú Nhuận, Quận Phú Nhuận cũ
  '27094': [10.8231, 106.7835], // Phường An Khánh, Thành phố Thủ Đức cũ
  '27097': [10.8231, 106.7835], // Phường Bình Trưng, Thành phố Thủ Đức cũ
  '27112': [10.8231, 106.7835], // Phường Cát Lái, Thành phố Thủ Đức cũ
  '27139': [10.779, 106.687], // Phường Xuân Hòa, Quận 3 cũ
  '27142': [10.779, 106.687], // Phường Nhiêu Lộc, Quận 3 cũ
  '27154': [10.779, 106.687], // Phường Bàn Cờ, Quận 3 cũ
  '27163': [10.7725, 106.6682], // Phường Hòa Hưng, Quận 10 cũ
  '27169': [10.7725, 106.6682], // Phường Diên Hồng, Quận 10 cũ
  '27190': [10.7725, 106.6682], // Phường Vườn Lài, Quận 10 cũ
  '27211': [10.7656, 106.6476], // Phường Hòa Bình, Quận 11 cũ
  '27226': [10.7656, 106.6476], // Phường Phú Thọ, Quận 11 cũ
  '27232': [10.7656, 106.6476], // Phường Bình Thới, Quận 11 cũ
  '27238': [10.7656, 106.6476], // Phường Minh Phụng, Quận 11 cũ
  '27259': [10.7608, 106.7071], // Phường Xóm Chiếu, Quận 4 cũ
  '27265': [10.7608, 106.7071], // Phường Khánh Hội, Quận 4 cũ
  '27286': [10.7608, 106.7071], // Phường Vĩnh Hội, Quận 4 cũ
  '27301': [10.7558, 106.6683], // Phường Chợ Quán, Quận 5 cũ
  '27316': [10.7558, 106.6683], // Phường An Đông, Quận 5 cũ
  '27343': [10.7558, 106.6683], // Phường Chợ Lớn, Quận 5 cũ
  '27349': [10.7457, 106.6391], // Phường Phú Lâm, Quận 6 cũ
  '27364': [10.7457, 106.6391], // Phường Bình Phú, Quận 6 cũ
  '27367': [10.7457, 106.6391], // Phường Bình Tây, Quận 6 cũ
  '27373': [10.7457, 106.6391], // Phường Bình Tiên, Quận 6 cũ
  '27418': [10.7211, 106.6292], // Phường Chánh Hưng, Quận 8 cũ
  '27424': [10.7211, 106.6292], // Phường Bình Đông, Quận 8 cũ
  '27427': [10.7211, 106.6292], // Phường Phú Định, Quận 8 cũ
  '27439': [10.7704, 106.5996], // Phường Bình Hưng Hòa, Quận Bình Tân cũ
  '27442': [10.7704, 106.5996], // Phường Bình Tân, Quận Bình Tân cũ
  '27448': [10.7704, 106.5996], // Phường Bình Trị Đông, Quận Bình Tân cũ
  '27457': [10.7704, 106.5996], // Phường Tân Tạo, Quận Bình Tân cũ
  '27460': [10.7704, 106.5996], // Phường An Lạc, Quận Bình Tân cũ
  '27475': [10.734, 106.7218], // Phường Tân Hưng, Quận 7 cũ
  '27478': [10.734, 106.7218], // Phường Tân Thuận, Quận 7 cũ
  '27484': [10.734, 106.7218], // Phường Phú Thuận, Quận 7 cũ
  '27487': [10.734, 106.7218], // Phường Tân Mỹ, Quận 7 cũ
  '27496': [10.99, 106.51], // Xã Tân An Hội, Huyện Củ Chi cũ
  '27508': [10.99, 106.51], // Xã An Nhơn Tây, Huyện Củ Chi cũ
  '27511': [10.99, 106.51], // Xã Nhuận Đức, Huyện Củ Chi cũ
  '27526': [10.99, 106.51], // Xã Thái Mỹ, Huyện Củ Chi cũ
  '27541': [10.99, 106.51], // Xã Phú Hòa Đông, Huyện Củ Chi cũ
  '27544': [10.99, 106.51], // Xã Bình Mỹ, Huyện Củ Chi cũ
  '27553': [10.99, 106.51], // Xã Củ Chi, Huyện Củ Chi cũ
  '27559': [10.886, 106.592], // Xã Hóc Môn, Huyện Hóc Môn cũ
  '27568': [10.886, 106.592], // Xã Đông Thạnh, Huyện Hóc Môn cũ
  '27577': [10.886, 106.592], // Xã Xuân Thới Sơn, Huyện Hóc Môn cũ
  '27592': [10.886, 106.592], // Xã Bà Điểm, Huyện Hóc Môn cũ
  '27595': [10.72, 106.58], // Xã Tân Nhựt, Huyện Bình Chánh cũ
  '27601': [10.72, 106.58], // Xã Vĩnh Lộc, Huyện Bình Chánh cũ
  '27604': [10.72, 106.58], // Xã Tân Vĩnh Lộc, Huyện Bình Chánh cũ
  '27610': [10.72, 106.58], // Xã Bình Lợi, Huyện Bình Chánh cũ
  '27619': [10.72, 106.58], // Xã Bình Hưng, Huyện Bình Chánh cũ
  '27628': [10.72, 106.58], // Xã Hưng Long, Huyện Bình Chánh cũ
  '27637': [10.72, 106.58], // Xã Bình Chánh, Huyện Bình Chánh cũ
  '27655': [10.675, 106.735], // Xã Nhà Bè, Huyện Nhà Bè cũ
  '27658': [10.675, 106.735], // Xã Hiệp Phước, Huyện Nhà Bè cũ
  '27664': [10.5167, 106.8789], // Xã Cần Giờ, Huyện Cần Giờ cũ
  '27667': [10.5167, 106.8789], // Xã Bình Khánh, Huyện Cần Giờ cũ
  '27673': [10.5167, 106.8789], // Xã An Thới Đông, Huyện Cần Giờ cũ
  '27676': [10.5167, 106.8789], // Xã Thạnh An, Huyện Cần Giờ cũ
}

/** Toạ độ để ước tính sản lượng của một phường, xã; mã lạ thì null */
export function wardCenter(communeCode: string) {
  const center = WARD_CENTERS[communeCode]
  return center ? { latitude: center[0], longitude: center[1] } : null
}
