export class MathUtils {
    //add two vectors
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
    //distance between two vectors
    static dist(x1, y1, z1, x2, y2, z2) {
        let dist;
        let dx;
        let dy;
        let dz;
        if (x1.x != undefined) {
            dx = y1.x - x1.x;
            dy = y1.y - x1.y;
            dz = y1.z - x1.z;
        }
        else {
            dx = x2 - x1;
            dy = y2 - y1;
            dz = z2 - z1;
        }
        dist = Math.sqrt((dx * dx) + (dy * dy) + (dz * dz));
        return dist;
    }
    static vectorsMatch(x1, y1, z1, x2, y2, z2) {
        if (x1.x == undefined) {
            if (x1 == x2 && y1 == y2 && z1 == z2) {
                return true;
            }
            else {
                return false;
            }
        }
        else {
            if (x1.x == y1.x && x1.y == y1.y && x1.z == y1.z) {
                return true;
            }
            else {
                return false;
            }
        }
    }
}
