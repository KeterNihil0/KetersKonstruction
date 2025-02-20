export class MathUtils {
    /**
     * Add two Vectors
     */
    static addVectors(x1, y1, z1, x2, y2, z2) {
        if (x1.x != undefined) {
            let dx = x1.x + y1.x;
            let dy = x1.y + y1.y;
            let dz = x1.z + y1.z;
            return { x: dx, y: dy, z: dz };
        }
        else {
            let dx = x1 + x2;
            let dy = y1 + y2;
            let dz = z1 + z2;
            return { x: dx, y: dy, z: dz };
        }
    }
}
